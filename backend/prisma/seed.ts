/**
 * Скрипт наполнения БД зарядными станциями.
 *
 * Источник 1 (автоматический): OpenChargeMap API — публичная база с фильтром
 * по стране. Покрытие России неполное (проверено по обсуждениям сообщества
 * OpenStreetMap), но это хорошая стартовая точка — тысячи станций уже
 * с координатами, операторами и типами разъёмов.
 *
 * Источник 2 (ручной): prisma/seed-data/manual-stations.json — станции,
 * которые вы нашли и проверили сами (сайты операторов: Яндекс.Заправки,
 * Россети, Sitronics, data.mos.ru и т.д.). Формат описан в
 * manual-stations.example.json.
 *
 * Запуск: npm run seed
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const OCM_API = 'https://api.openchargemap.io/v3/poi/';
const COUNTRY_CODE = 'RU';
const PAGE_SIZE = 10; // тестами выяснили: 5 станций проходят быстро, 20+ зависают на этом VPS — берём с запасом
const MAX_PAGES = 400; // до 4000 станций суммарно
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const FETCH_TIMEOUT_MS = 20_000;
const BETWEEN_PAGES_DELAY_MS = 400; // небольшая пауза между запросами, на всякий случай

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface OcmConnection {
  ConnectionType?: { Title?: string };
  PowerKW?: number;
}

interface OcmPoi {
  ID: number;
  AddressInfo: {
    Title: string;
    AddressLine1?: string;
    Town?: string;
    Latitude: number;
    Longitude: number;
  };
  OperatorInfo?: { Title?: string };
  Connections?: OcmConnection[];
}

// Грубое сопоставление названий разъёмов OCM с нашими тегами.
function mapConnectorType(title?: string): string | null {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes('ccs') || t.includes('combo')) return 'CCS2';
  if (t.includes('chademo')) return 'CHAdeMO';
  if (t.includes('gb/t') || t.includes('gbt')) return 'GBT';
  if (t.includes('type 2') || t.includes('type2') || t.includes('mennekes')) return 'Type2';
  if (t.includes('type 1') || t.includes('j1772')) return 'Type1';
  return null;
}

function speedFromKw(kw?: number): 'slow' | 'fast' | 'ultra_fast' {
  if (!kw) return 'slow';
  if (kw >= 50) return 'ultra_fast';
  if (kw >= 22) return 'fast';
  return 'slow';
}

// Заготовки интеграций — появляются в /admin -> Интеграции сразу после
// первого запуска seed, останется только вписать значения и включить.
async function ensureDefaultIntegrations() {
  const defaults = [
    { key: 'openchargemap', name: 'OpenChargeMap' },
    { key: 'yandex_maps', name: 'Яндекс.Карты' },
    { key: '2gis', name: '2GIS' },
  ];

  for (const d of defaults) {
    await prisma.integration.upsert({
      where: { key: d.key },
      update: {}, // не перезаписываем, если уже настроено через админку
      create: { key: d.key, name: d.name, isEnabled: false },
    });
  }
}

async function fetchWithRetry(url: string, apiKey: string): Promise<OcmPoi[]> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'proev.ru-seed-script/1.0 (+https://proev.ru)',
          Accept: 'application/json',
          'X-API-Key': apiKey,
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`OpenChargeMap API ответил ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      console.log(`  Попытка ${attempt}/${MAX_RETRIES} не удалась (${(err as Error).message}), жду ${RETRY_DELAY_MS}мс...`);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function fetchOcmStations(): Promise<OcmPoi[]> {
  // Если есть локально скачанный дамп (см. prisma/seed-data/ocm-raw-dump.json) —
  // используем его вместо сетевого запроса. Актуально, когда с конкретного
  // сервера соединение до OpenChargeMap нестабильно/блокируется, но дамп
  // можно получить с другой машины (см. infra/README.md, раздел про OCM).
  const dumpPath = path.join(__dirname, 'seed-data', 'ocm-raw-dump.json');
  if (fs.existsSync(dumpPath)) {
    console.log(`Использую локальный дамп OpenChargeMap: ${dumpPath}`);
    return JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));
  }

  const integration = await prisma.integration.findUnique({ where: { key: 'openchargemap' } });
  const apiKey = (integration?.isEnabled ? integration.apiKey : null) || process.env.OCM_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Не задан ключ OpenChargeMap. Впиши его в /admin -> Интеграции -> OpenChargeMap ' +
        '(включи isEnabled) — бесплатный ключ берётся на https://openchargemap.org, ' +
        'Profile -> Register for API Key. Либо для локальной разработки — переменная OCM_API_KEY в .env.',
    );
  }

  const allStations: OcmPoi[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const url = `${OCM_API}?output=json&countrycode=${COUNTRY_CODE}&maxresults=${PAGE_SIZE}&offset=${offset}&compact=true&verbose=false`;
    console.log(`Загружаю станции из OpenChargeMap (страница ${page + 1}, offset ${offset})...`);

    const pois = await fetchWithRetry(url, apiKey);
    allStations.push(...pois);
    console.log(`  Получено ${pois.length} станций (всего пока: ${allStations.length})`);

    if (pois.length < PAGE_SIZE) break; // это была последняя страница
    await sleep(BETWEEN_PAGES_DELAY_MS);
  }

  return allStations;
}

async function importOcmStations() {
  const pois = await fetchOcmStations();
  console.log(`Получено ${pois.length} станций из OpenChargeMap`);

  let created = 0;
  let skipped = 0;

  for (const poi of pois) {
    if (!poi.AddressInfo?.Latitude || !poi.AddressInfo?.Longitude) {
      skipped++;
      continue;
    }

    const connectorTypes = Array.from(
      new Set((poi.Connections ?? []).map((c) => mapConnectorType(c.ConnectionType?.Title)).filter(Boolean)),
    ) as string[];

    const maxPower = Math.max(0, ...(poi.Connections ?? []).map((c) => c.PowerKW ?? 0));

    // externalId используем для идемпотентности — повторный запуск не создаст дубликаты
    const externalId = `ocm-${poi.ID}`;

    await prisma.chargingStation.upsert({
      where: { id: externalId },
      update: {},
      create: {
        id: externalId,
        name: poi.AddressInfo.Title || 'Зарядная станция',
        networkOperator: poi.OperatorInfo?.Title ?? 'Неизвестный оператор',
        latitude: poi.AddressInfo.Latitude,
        longitude: poi.AddressInfo.Longitude,
        address: poi.AddressInfo.AddressLine1,
        city: poi.AddressInfo.Town,
        connectorTypes,
        chargingSpeed: speedFromKw(maxPower || undefined),
        powerKw: maxPower || null,
        status: 'unknown', // статус узнаём только от пользователей, не от статичного импорта
        verified: false,
      },
    });
    created++;
  }

  console.log(`Импортировано/обновлено: ${created}, пропущено (нет координат): ${skipped}`);
}

async function importManualStations() {
  const filePath = path.join(__dirname, 'seed-data', 'manual-stations.json');
  if (!fs.existsSync(filePath)) {
    console.log('manual-stations.json не найден — пропускаю ручной импорт (см. manual-stations.example.json)');
    return;
  }

  const stations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Импортирую ${stations.length} станций из ручного списка`);

  for (const s of stations) {
    await prisma.chargingStation.upsert({
      where: { id: `manual-${s.id}` },
      update: {},
      create: {
        id: `manual-${s.id}`,
        name: s.name,
        networkOperator: s.networkOperator,
        latitude: s.latitude,
        longitude: s.longitude,
        address: s.address,
        city: s.city,
        connectorTypes: s.connectorTypes ?? [],
        chargingSpeed: s.chargingSpeed ?? 'fast',
        powerKw: s.powerKw ?? null,
        priceInfo: s.priceInfo ?? null,
        status: 'unknown',
        verified: true, // ручные записи считаем проверенными
      },
    });
  }
}

async function main() {
  await ensureDefaultIntegrations();
  await ensureDefaultNewsSources();
  await importOcmStations();
  await importManualStations();
}

async function ensureDefaultNewsSources() {
  const defaults = [
    {
      name: 'Avtocharge.ru — новости EV',
      feedUrl: 'https://avtocharge.ru/feed/',
    },
    {
      name: 'За рулём — электромобили',
      feedUrl: 'https://www.zr.ru/rss/tags/elektromobili-i-gibridy/',
    },
    {
      name: 'Autonews.ru — электромобили',
      feedUrl: 'https://www.autonews.ru/rss/',
    },
    {
      name: 'РБК Авто',
      feedUrl: 'https://auto.rbc.ru/rss/',
    },
  ];

  for (const d of defaults) {
    await prisma.newsSource.upsert({
      where: { feedUrl: d.feedUrl },
      update: {},
      create: {
        name: d.name,
        feedUrl: d.feedUrl,
        isEnabled: false, // включать вручную после проверки в /admin -> Новости -> Источники
      },
    });
  }
  console.log(`Источники новостей: заготовки созданы (${defaults.length} шт.) — включи нужные в /admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
