import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'SxGeoCity.dat');
const DB_URL  = 'https://sypexgeo.net/files/SxGeoCity.zip';

const CITY_RU: Record<string, string> = {
  'Moscow': 'Москва', 'Saint Petersburg': 'Санкт-Петербург',
  'Novosibirsk': 'Новосибирск', 'Yekaterinburg': 'Екатеринбург',
  'Nizhny Novgorod': 'Нижний Новгород', 'Kazan': 'Казань',
  'Chelyabinsk': 'Челябинск', 'Omsk': 'Омск', 'Samara': 'Самара',
  'Rostov-on-Don': 'Ростов-на-Дону', 'Ufa': 'Уфа',
  'Krasnoyarsk': 'Красноярск', 'Voronezh': 'Воронеж',
  'Perm': 'Пермь', 'Volgograd': 'Волгоград', 'Krasnodar': 'Краснодар',
  'Saratov': 'Саратов', 'Tyumen': 'Тюмень', 'Vladivostok': 'Владивосток',
  'Irkutsk': 'Иркутск', 'Barnaul': 'Барнаул', 'Khabarovsk': 'Хабаровск',
  'Izhevsk': 'Ижевск', 'Kaliningrad': 'Калининград', 'Sochi': 'Сочи',
  'Tolyatti': 'Тольятти', 'Togliatti': 'Тольятти', 'Surgut': 'Сургут',
  'Makhachkala': 'Махачкала', 'Ulyanovsk': 'Ульяновск',
  'Yaroslavl': 'Ярославль', 'Ryazan': 'Рязань', 'Penza': 'Пенза',
  'Astrakhan': 'Астрахань', 'Naberezhnye Chelny': 'Набережные Челны',
  'Lipetsk': 'Липецк', 'Tula': 'Тула', 'Kirov': 'Киров',
  'Cheboksary': 'Чебоксары', 'Ivanovo': 'Иваново',
  'Bryansk': 'Брянск', 'Tver': 'Тверь', 'Kursk': 'Курск',
  'Orenburg': 'Оренбург', 'Kemerovo': 'Кемерово', 'Tomsk': 'Томск',
  'Novokuznetsk': 'Новокузнецк', 'Vladikavkaz': 'Владикавказ',
  'Magnitogorsk': 'Магнитогорск', 'Nizhny Tagil': 'Нижний Тагил',
  'Murmansk': 'Мурманск', 'Belgorod': 'Белгород', 'Tumen': 'Тюмень',
};

@Injectable()
export class GeoipService implements OnModuleInit {
  private readonly logger = new Logger(GeoipService.name);
  private geo: any = null;

  async onModuleInit() {
    await this.loadDb();
  }

  private async loadDb() {
    // Если база уже есть — загружаем
    if (existsSync(DB_PATH)) {
      try {
        const { SypexGeoClient } = await import('@gorkun/sypex-geo');
        this.geo = new SypexGeoClient(DB_PATH);
        this.logger.log('Sypex Geo City DB загружена локально');
        return;
      } catch (e) {
        this.logger.warn('Ошибка загрузки Sypex Geo: ' + (e as Error).message);
      }
    } else {
      this.logger.warn('SxGeoCity.dat не найдена — используем ip-api.com как fallback');
    }
  }

  lookup(ip: string): { city: string | null; country: string | null } {
    if (!this.geo) return { city: null, country: null };

    try {
      const result = this.geo.get(ip);
      if (!result) return { city: null, country: null };

      // Sypex Geo возвращает русское название города в city.name_ru
      const cityRu = result.city?.name_ru || result.city?.name;
      const cityEn = result.city?.name;
      const country = result.country?.iso || null;

      // Приоритет: русское поле → маппинг по английскому
      const city = cityRu || (cityEn ? (CITY_RU[cityEn] || cityEn) : null);

      return { city: city || null, country };
    } catch {
      return { city: null, country: null };
    }
  }
}
