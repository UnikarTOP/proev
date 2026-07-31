import { Controller, Get, Req, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { GeoipService } from './geoip.service';

@Controller('geoip')
export class GeoipController {
  constructor(private readonly geoipService: GeoipService) {}

  @SkipThrottle()
  @Get('city')
  async detectCity(@Req() req: any) {
    const ip =
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress;

    // Локальные адреса
    if (!ip || ip === '127.0.0.1' || ip === '::1' ||
        ip.startsWith('192.168') || ip.startsWith('10.') ||
        ip.startsWith('172.')) {
      return { city: null, country: null, source: 'local' };
    }

    // Пробуем Sypex Geo (локальная база)
    const local = this.geoipService.lookup(ip);
    if (local.city) {
      return { ...local, source: 'sypex' };
    }

    // Fallback: ip-api.com
    try {
      const res = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,city,countryCode&lang=ru`,
        { signal: AbortSignal.timeout(3_000) },
      );
      const data = await res.json();
      if (data.status === 'success' && data.city) {
        return { city: data.city, country: data.countryCode, source: 'ip-api' };
      }
    } catch {}

    return { city: null, country: null, source: 'none' };
  }

  // GET /api/geoip/dadata/suggest?q=москва&count=10
  @SkipThrottle()
  @Get('dadata/suggest')
  async dadataSuggest(@Query('q') q: string, @Query('count') count = '10') {
    if (!q || q.length < 2) return { suggestions: [] };
    const apiKey = process.env.DADATA_API_KEY;
    if (!apiKey) return { suggestions: [], error: 'DADATA_API_KEY not set' };
    try {
      const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${apiKey}`,
        },
        body: JSON.stringify({
          query: q,
          count: Math.min(parseInt(count) || 10, 20),
          locations: [
            { country_iso_code: 'RU' },
            { country_iso_code: 'BY' },
          ],
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      return data;
    } catch (e) {
      return { suggestions: [], error: 'DaData unavailable' };
    }
  }

  // POST /api/geoip/dadata/clean - стандартизация адреса (с сервера, нужен секретный ключ)
  @SkipThrottle()
  @Get('dadata/geocode')
  async dadataGeocode(@Query('q') q: string) {
    if (!q) return null;
    const apiKey = process.env.DADATA_API_KEY;
    const secretKey = process.env.DADATA_SECRET_KEY;
    if (!apiKey || !secretKey) return { error: 'DaData keys not set' };
    try {
      const res = await fetch('https://cleaner.dadata.ru/api/v1/clean/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${apiKey}`,
          'X-Secret': secretKey,
        },
        body: JSON.stringify([q]),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      if (!Array.isArray(data) || !data[0]) return null;
      const r = data[0];
      return {
        result: r.result,
        lat: r.geo_lat ? parseFloat(r.geo_lat) : null,
        lon: r.geo_lon ? parseFloat(r.geo_lon) : null,
        city: r.city || r.region,
        qc_geo: r.qc_geo,
      };
    } catch (e) {
      return { error: 'DaData unavailable' };
    }
  }

}