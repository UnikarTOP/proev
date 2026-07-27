import { Controller, Get, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

const CITY_ALIASES: Record<string, string> = {
  'moscow':'Москва','saint-petersburg':'Санкт-Петербург','st. petersburg':'Санкт-Петербург',
  'novosibirsk':'Новосибирск','yekaterinburg':'Екатеринбург','nizhny novgorod':'Нижний Новгород',
  'kazan':'Казань','chelyabinsk':'Челябинск','omsk':'Омск','samara':'Самара',
  'rostov-on-don':'Ростов-на-Дону','ufa':'Уфа','krasnoyarsk':'Красноярск',
  'voronezh':'Воронеж','perm':'Пермь','volgograd':'Волгоград','krasnodar':'Краснодар',
  'saratov':'Саратов','tyumen':'Тюмень','vladivostok':'Владивосток','irkutsk':'Иркутск',
  'barnaul':'Барнаул','khabarovsk':'Хабаровск','izhevsk':'Ижевск','kaliningrad':'Калининград',
  'sochi':'Сочи','togliatti':'Тольятти','surgut':'Сургут','tolyatti':'Тольятти',
};

function normalizeCity(raw: string): string {
  return CITY_ALIASES[raw?.toLowerCase()?.trim()] || raw;
}

@Controller('geoip')
export class GeoipController {

  @SkipThrottle()
  @Get('city')
  async detectCity(@Req() req: any) {
    const ip =
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress;

    if (!ip || ip === '127.0.0.1' || ip === '::1' ||
        ip.startsWith('192.168') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return { city: null, country: null };
    }

    try {
      const res = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,city,countryCode&lang=ru`,
        { signal: AbortSignal.timeout(3_000) },
      );
      const data = await res.json();
      if (data.status !== 'success') return { city: null, country: null };
      return { city: normalizeCity(data.city), country: data.countryCode };
    } catch {
      return { city: null, country: null };
    }
  }
}
