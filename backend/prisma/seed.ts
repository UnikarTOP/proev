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
    { key: 'data_mos_ru', name: 'data.mos.ru — электрозаправки Москвы' },
    {
      key: 'map_provider',
      name: 'Провайдер карты (osm | yandex | 2gis)',
      // Значение apiKey используем как название провайдера — не секрет,
      // просто настройка. Меняется в /admin -> Интеграции -> map_provider.
    },
  ];

  for (const d of defaults) {
    await prisma.integration.upsert({
      where: { key: d.key },
      update: {}, // не перезаписываем, если уже настроено через админку
      create: { key: d.key, name: d.name, isEnabled: false },
    });
  }
}

// ─── data.mos.ru ────────────────────────────────────────────────────────────
//
// Официальный реестр электрозаправок Москвы от Правительства Москвы.
// Источник: https://data.mos.ru/opendata/7704786030-elektrozapravki
//
// Для работы нужен бесплатный API-ключ:
// 1. Зарегистрироваться на https://apidata.mos.ru
// 2. Получить ключ в профиле
// 3. Вставить ключ в /admin -> API-ключи -> data.mos.ru и включить isEnabled
//
// Числовой ID датасета выясняем автоматически через поиск по SefUrl.

const DATA_MOS_API = 'https://apidata.mos.ru/v1';
const DATA_MOS_DATASET_SEFURL = '7704786030-elektrozapravki';

interface MosFeature {
  geometry?: { coordinates?: number[] };
  properties?: {
    Attributes?: {
      Name?: string;
      Address?: string;
      Longitude_WGS84?: string | number;
      Latitude_WGS84?: string | number;
      ConnectorType?: string;
      ChargingType?: string;
      OperatorName?: string;
      PowerKw?: string | number;
      WorkingHours?: string;
    };
  };
}

async function importMosStations() {
  const integration = await prisma.integration.findUnique({ where: { key: 'data_mos_ru' } });
  if (!integration?.isEnabled || !integration.apiKey) {
    console.log('data.mos.ru: интеграция не включена — пропускаю.');
    console.log('  Чтобы включить: /admin -> API-ключи -> data.mos.ru -> вставь ключ -> isEnabled=true');
    return;
  }

  const apiKey = integration.apiKey;
  console.log('Импортирую зарядные станции из data.mos.ru...');

  try {
    // Шаг 1: находим числовой ID датасета по SefUrl
    const searchRes = await fetch(
      `${DATA_MOS_API}/datasets?$filter=SefUrl eq '${DATA_MOS_DATASET_SEFURL}'&api_key=${apiKey}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) },
    );

    if (!searchRes.ok) {
      throw new Error(`Поиск датасета: HTTP ${searchRes.status}`);
    }

    const datasets = await searchRes.json();
    const dataset = Array.isArray(datasets) ? datasets[0] : datasets?.value?.[0];

    if (!dataset?.Id) {
      // Если поиск по SefUrl не сработал — пробуем по известному числовому ID
      console.log('  Не нашли датасет через поиск, пробую по прямому ID...');
      return await importMosStationsById(apiKey, 20562);  // числовой ID датасета электрозаправок
    }

    await importMosStationsById(apiKey, dataset.Id);
  } catch (err) {
    console.warn(`  data.mos.ru ошибка: ${(err as Error).message}`);
    console.warn('  Пропускаю этот источник, продолжаю с остальными.');
  }
}

async function importMosStationsById(apiKey: string, datasetId: number) {
  let page = 0;
  const pageSize = 100;
  let total = 0;
  let created = 0;

  while (true) {
    const url = `${DATA_MOS_API}/datasets/${datasetId}/features?$top=${pageSize}&$skip=${page * pageSize}&api_key=${apiKey}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      console.warn(`  data.mos.ru: страница ${page + 1} вернула ${res.status}, прерываю`);
      break;
    }

    const geojson = await res.json();
    const features: MosFeature[] = geojson?.features ?? geojson ?? [];

    if (!features.length) break;

    for (const f of features) {
      const attrs = f.properties?.Attributes ?? f.properties ?? {};
      const coords = f.geometry?.coordinates;

      // data.mos.ru хранит координаты в геометрии [lng, lat] или в атрибутах
      const lng = coords?.[0] ?? parseFloat(String(attrs.Longitude_WGS84 ?? ''));
      const lat = coords?.[1] ?? parseFloat(String(attrs.Latitude_WGS84 ?? ''));

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;

      const name = attrs.Name || 'Электрозаправка (Москва)';
      const address = attrs.Address;
      const operator = attrs.OperatorName ?? 'Россети / Москва';
      const powerKw = attrs.PowerKw ? parseFloat(String(attrs.PowerKw)) : undefined;

      // Тип разъёма из поля ConnectorType
      const rawConnector = String(attrs.ConnectorType ?? '');
      const connectorTypes: string[] = [];
      if (rawConnector.toLowerCase().includes('ccs') || rawConnector.toLowerCase().includes('combo')) connectorTypes.push('CCS2');
      if (rawConnector.toLowerCase().includes('chademo')) connectorTypes.push('CHAdeMO');
      if (rawConnector.toLowerCase().includes('type 2') || rawConnector.toLowerCase().includes('type2')) connectorTypes.push('Type2');
      if (rawConnector.toLowerCase().includes('gb/t')) connectorTypes.push('GBT');

      await prisma.chargingStation.upsert({
        where: { id: `mos-${datasetId}-${total + features.indexOf(f)}` },
        update: {},
        create: {
          id: `mos-${datasetId}-${total + features.indexOf(f)}`,
          name,
          networkOperator: operator,
          latitude: lat,
          longitude: lng,
          address,
          city: 'Москва',
          connectorTypes,
          chargingSpeed: speedFromKw(powerKw),
          powerKw: powerKw ?? null,
          status: 'unknown',
          verified: true, // официальные данные мэрии — считаем проверенными
        },
      });
      created++;
    }

    console.log(`  Страница ${page + 1}: сохранено ${features.length} записей (итого: ${created})`);
    total += features.length;

    if (features.length < pageSize) break;
    page++;
    await sleep(500);
  }

  console.log(`data.mos.ru: импортировано ${created} станций`);
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

async function importOcmStations() {
  // Пишем в БД постранично — не ждём загрузки всех страниц.
  // Так данные появляются в базе сразу, и Ctrl+C в любой момент сохраняет уже загруженное.

  const integration = await prisma.integration.findUnique({ where: { key: 'openchargemap' } });
  const apiKey = (integration?.isEnabled ? integration.apiKey : null) || process.env.OCM_API_KEY;

  if (!apiKey) {
    const dumpPath = path.join(__dirname, 'seed-data', 'ocm-raw-dump.json');
    if (fs.existsSync(dumpPath)) {
      console.log(`Использую локальный дамп: ${dumpPath}`);
      const pois: OcmPoi[] = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));
      await savePoisToDb(pois);
      return;
    }
    throw new Error(
      'Не задан ключ OpenChargeMap. Впиши его в /admin -> Интеграции -> OpenChargeMap ' +
        '(включи isEnabled) — бесплатный ключ берётся на https://openchargemap.org.',
    );
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const url = `${OCM_API}?output=json&countrycode=${COUNTRY_CODE}&maxresults=${PAGE_SIZE}&offset=${offset}&compact=true&verbose=false`;
    console.log(`Загружаю станции из OpenChargeMap (страница ${page + 1}, offset ${offset})...`);

    let pois: OcmPoi[];
    try {
      pois = await fetchWithRetry(url, apiKey);
    } catch (err) {
      console.log(`  Пропускаю страницу ${page + 1} после всех попыток: ${(err as Error).message}`);
      continue;
    }

    console.log(`  Получено ${pois.length} станций (всего загружено: ${(page) * PAGE_SIZE + pois.length})`);

    // Сразу пишем в БД
    const { created, skipped } = await savePoisToDb(pois);
    totalCreated += created;
    totalSkipped += skipped;
    console.log(`  Сохранено в БД: ${created}, пропущено: ${skipped} (итого в БД: ${totalCreated})`);

    if (pois.length < PAGE_SIZE) {
      console.log('  Последняя страница — завершаем.');
      break;
    }

    await sleep(BETWEEN_PAGES_DELAY_MS);
  }

  console.log(`\nИмпорт завершён. Всего сохранено: ${totalCreated}, пропущено (нет координат): ${totalSkipped}`);
}

async function savePoisToDb(pois: OcmPoi[]): Promise<{ created: number; skipped: number }> {
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
        status: 'unknown',
        verified: false,
      },
    });
    created++;
  }

  return { created, skipped };
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
  await importMosStations();
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
