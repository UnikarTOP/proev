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
const MAX_RESULTS = 2000; // OCM отдаёт максимум ~2000-3000 за запрос без пагинации по offset

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

async function fetchOcmStations(): Promise<OcmPoi[]> {
  const integration = await prisma.integration.findUnique({ where: { key: 'openchargemap' } });
  const apiKey = (integration?.isEnabled ? integration.apiKey : null) || process.env.OCM_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Не задан ключ OpenChargeMap. Впиши его в /admin -> Интеграции -> OpenChargeMap ' +
        '(включи isEnabled) — бесплатный ключ берётся на https://openchargemap.org, ' +
        'Profile -> Register for API Key. Либо для локальной разработки — переменная OCM_API_KEY в .env.',
    );
  }

  const url = `${OCM_API}?output=json&countrycode=${COUNTRY_CODE}&maxresults=${MAX_RESULTS}&compact=true&verbose=false`;
  console.log(`Загружаю станции из OpenChargeMap: ${url}`);
  const res = await fetch(url, {
    headers: {
      // Без User-Agent некоторые запросы блокируются как похожие на ботов
      // (Node.js fetch по умолчанию не отправляет такой заголовок, в
      // отличие от браузеров).
      'User-Agent': 'proev.ru-seed-script/1.0 (+https://proev.ru)',
      Accept: 'application/json',
      'X-API-Key': apiKey,
    },
  });
  if (!res.ok) {
    throw new Error(`OpenChargeMap API ответил ${res.status}`);
  }
  return res.json();
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
  await importOcmStations();
  await importManualStations();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
