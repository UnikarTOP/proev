import { Controller, Get, Req } from '@nestjs/common';
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
}
