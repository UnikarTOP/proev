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

// ─── OpenStreetMap Overpass API ─────────────────────────────────────────────
//
// Публичный API без регистрации и ключей. Возвращает все зарядные станции
// России с тегом amenity=charging_station из OpenStreetMap.
// Данных обычно больше, чем в OpenChargeMap — сообщество OSM активно
// добавляет российские станции.

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function osmConnectors(tags: Record<string, string>): string[] {
  const result: string[] = [];
  const socket = (tags['socket:type2'] || tags['socket:type2_combo']) ? 'Type2' : null;
  if (socket) result.push(socket);
  if (tags['socket:ccs'] || tags['socket:type2_combo']) result.push('CCS2');
  if (tags['socket:chademo']) result.push('CHAdeMO');
  if (tags['socket:gbt_dc'] || tags['socket:gbt_ac']) result.push('GBT');
  if (tags['socket:type1']) result.push('Type1');
  // Убираем дубли
  return Array.from(new Set(result));
}

function osmSpeed(tags: Record<string, string>): 'slow' | 'fast' | 'ultra_fast' {
  const output = parseFloat(tags['maxpower'] || tags['capacity:electrical'] || '0');
  if (output >= 50) return 'ultra_fast';
  if (output >= 22) return 'fast';
  // Если мощность не указана — смотрим на тип разъёма
  if (tags['socket:chademo'] || tags['socket:ccs']) return 'fast';
  return 'slow';
}

async function importOsmStations() {
  console.log('Импортирую зарядные станции из OpenStreetMap (Overpass API)...');

  // Запрос всех зарядных станций в России
  const query = `
[out:json][timeout:60];
area["ISO3166-1"="RU"][admin_level=2]->.ru;
(
  node[amenity=charging_station](area.ru);
  way[amenity=charging_station](area.ru);
);
out center tags;
  `.trim();

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
        'User-Agent': 'proev.ru/1.0 (+https://proev.ru)',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) throw new Error(`Overpass API: HTTP ${res.status}`);

    const data = await res.json();
    const elements: OsmElement[] = data.elements ?? [];
    console.log(`  Получено ${elements.length} объектов из OSM`);

    let created = 0;
    let skipped = 0;

    for (const el of elements) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!lat || !lon) { skipped++; continue; }

      const tags = el.tags ?? {};
      const name = tags['name'] || tags['operator'] || 'Зарядная станция (OSM)';
      const operator = tags['operator'] || tags['network'] || 'Неизвестный оператор';
      const city = tags['addr:city'] || tags['addr:suburb'] || undefined;
      const address = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ') || undefined;
      const powerKw = parseFloat(tags['maxpower'] || '0') || undefined;
      const connectorTypes = osmConnectors(tags);

      await prisma.chargingStation.upsert({
        where: { id: `osm-${el.id}` },
        update: {},
        create: {
          id: `osm-${el.id}`,
          name,
          networkOperator: operator,
          latitude: lat,
          longitude: lon,
          address,
          city,
          connectorTypes,
          chargingSpeed: osmSpeed(tags),
          powerKw: powerKw ?? null,
          status: 'unknown',
          verified: false,
        },
      });
      created++;
    }

    console.log(`OSM: импортировано ${created}, пропущено (нет координат): ${skipped}`);
  } catch (err) {
    console.warn(`  Overpass API ошибка: ${(err as Error).message}`);
    console.warn('  Пропускаю OSM, продолжаю с остальными источниками.');
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
  await seedServiceCategories();
  await seedDemoPartner();
  await importOsmStations();
  await importOcmStations();
  await importManualStations();
}

async function seedDemoPartner() {
  const category = await prisma.serviceCategory.findUnique({ where: { slug: 'sto' } });
  if (!category) { console.log('Категория СТО не найдена — запустите seed повторно'); return; }

  await prisma.serviceProvider.upsert({
    where: { slug: 'ev-service-demo' },
    update: {},
    create: {
      name: 'EV Service — Демо СТО',
      slug: 'ev-service-demo',
      categoryId: category.id,
      tagline: 'Профессиональный сервис для электромобилей в Москве',
      description: 'Специализированное СТО для обслуживания и ремонта электромобилей всех марок. ' +
        'Работаем с Tesla, BYD, Zeekr, Evolute, Москвич 3е и другими. ' +
        'Официальная гарантия на все работы. Диагностика за 1 час. Собственный склад запчастей.',
      city: 'Москва',
      address: 'ул. Нагатинская, 18с2',
      phone: '+7 (495) 123-45-67',
      telegram: 'evservice_demo',
      workingHours: 'Пн–Вс 9:00–21:00',
      yearFounded: 2021,
      services: [
        'Диагностика батареи',
        'ТО по регламенту',
        'Ремонт электромотора',
        'Замена зарядного порта',
        'Обслуживание тормозной системы',
        'Ремонт подвески',
        'Кондиционирование батареи',
        'Обновление прошивки',
      ],
      brands: [
        'Tesla Model 3', 'Tesla Model Y',
        'BYD Han', 'BYD Atto 3', 'BYD Seal',
        'Zeekr 001', 'Zeekr X',
        'Москвич 3е',
        'Evolute i-Pro', 'Evolute i-Joy',
        'NIO ET5',
      ],
      photos: [
        // EV в сервисном центре — Tesla на подъёмнике
        'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80',
        // Зарядка электромобиля
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
        // Современный автосервис — диагностика
        'https://images.unsplash.com/photo-1617886903355-9354bb57751f?w=800&q=80',
        // Электромобиль BYD/Chinese EV крупным планом
        'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&q=80',
        // Зарядная станция в паркинге
        'https://images.unsplash.com/photo-1647166545674-ce28ce93bdca?w=800&q=80',
        // Мастер работает с EV
        'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80',
      ],
      ratingAvg: 4.9,
      reviewCount: 47,
      verified: true,
      isPaidPlacement: true,
      isPublished: true,
    },
  });

  // Добавляем демо-отзывы если их ещё нет
  const provider = await prisma.serviceProvider.findUnique({ where: { slug: 'ev-service-demo' } });
  if (!provider) return;

  const existingReviews = await prisma.providerReview.count({ where: { providerId: provider.id } });
  if (existingReviews === 0) {
    await prisma.providerReview.createMany({
      data: [
        { providerId: provider.id, rating: 5, text: 'Отличный сервис! Диагностику Tesla Model 3 сделали за час, нашли проблему с батареей и быстро починили. Буду обращаться постоянно.', createdAt: new Date('2026-07-10') },
        { providerId: provider.id, rating: 5, text: 'Единственное место в Москве где разбираются в BYD Han. Обслуживание прошло отлично, цены адекватные.', createdAt: new Date('2026-07-05') },
        { providerId: provider.id, rating: 4, text: 'Хорошая работа по Zeekr 001. Единственный минус — очередь на 3 дня вперёд, запись нужна заранее.', createdAt: new Date('2026-06-28') },
      ],
    });
    await prisma.serviceProvider.update({
      where: { id: provider.id },
      data: { reviewCount: 47 },
    });
  }

  console.log('Демо-партнёр EV Service создан → /services/ev-service-demo');

  // Добавляем демо-статьи блога если их ещё нет
  const existingPosts = await prisma.providerPost.count({ where: { providerId: provider.id } });
  if (existingPosts === 0) {
    const posts = [
      {
        title: 'Как продлить жизнь батареи электромобиля: 7 главных правил',
        slug: 'kak-prodlit-zhizn-batarei-ev-' + Date.now().toString(36),
        excerpt: 'Аккумулятор — самый дорогой компонент электромобиля. Рассказываем как его беречь и почему не стоит заряжать до 100%.',
        coverUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
        content: `
          <h2>Почему это важно</h2>
          <p>Замена батареи электромобиля стоит от 500 000 до 2 000 000 рублей. Правильная эксплуатация позволяет сохранить до 90% ёмкости после 200 000 км пробега.</p>
          <h2>7 правил эксплуатации батареи</h2>
          <ol>
            <li><strong>Заряжайте до 80%, не до 100%.</strong> Постоянная зарядка до максимума ускоряет деградацию. Исключение — длительные поездки.</li>
            <li><strong>Не разряжайте ниже 10–15%.</strong> Глубокий разряд вреден для литий-ионных ячеек.</li>
            <li><strong>Избегайте быстрой зарядки каждый день.</strong> DC Fast Charge удобен в дороге, но для ежедневной зарядки лучше AC.</li>
            <li><strong>Паркуйтесь в тени летом.</strong> Перегрев батареи при температуре выше +40°C ускоряет деградацию.</li>
            <li><strong>Не оставляйте надолго при низком заряде.</strong> Если планируете не ездить 2+ недели — зарядите до 50%.</li>
            <li><strong>Используйте функцию кондиционирования батареи.</strong> Большинство EV умеют предварительно прогревать/охлаждать батарею перед зарядкой.</li>
            <li><strong>Регулярно проходите диагностику.</strong> Раз в год проверяйте состояние батареи у специалистов — это позволит выявить проблемы заранее.</li>
          </ol>
          <h2>Как мы проверяем батарею</h2>
          <p>В нашем сервисе мы используем профессиональное оборудование для диагностики состояния каждой ячейки батареи. Процедура занимает 30–60 минут и позволяет точно оценить остаточную ёмкость и выявить деградирующие ячейки.</p>
        `,
        isPublished: true,
        publishedAt: new Date('2026-07-15'),
      },
      {
        title: 'BYD Han vs Tesla Model 3: сравниваем по результатам обслуживания',
        slug: 'byd-han-vs-tesla-model-3-' + (Date.now() + 1).toString(36),
        excerpt: 'За два года работы мы обслужили более 200 автомобилей каждой модели. Делимся объективными наблюдениями.',
        coverUrl: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&q=80',
        content: `
          <h2>Откуда данные</h2>
          <p>С 2024 года через наш сервис прошли 847 автомобилей. Из них 312 — BYD Han и 289 — Tesla Model 3. Достаточная выборка для объективных выводов.</p>
          <h2>Надёжность</h2>
          <p><strong>Tesla Model 3</strong> реже обращается с механическими проблемами. Основные обращения — программные обновления и замена элементов подвески после 80 000 км.</p>
          <p><strong>BYD Han</strong> чаще требует замены расходников — щётки, фильтры. Зато батарея показывает лучшую устойчивость к морозу: при -20°C теряет на 15–20% меньше запаса хода чем Model 3.</p>
          <h2>Стоимость обслуживания</h2>
          <p>По нашим данным, годовое ТО BYD Han обходится на 18–22% дешевле чем Tesla Model 3 из-за более доступных запчастей.</p>
          <h2>Вывод</h2>
          <p>Обе машины надёжны. Выбор зависит от приоритетов: если важна экосистема и программная часть — Tesla, если важна стоимость обслуживания и зимняя батарея — BYD Han.</p>
        `,
        isPublished: true,
        publishedAt: new Date('2026-07-08'),
      },
      {
        title: 'Зарядка дома: какую станцию выбрать и как установить',
        slug: 'zaryadka-doma-kak-vybrat-' + (Date.now() + 2).toString(36),
        excerpt: 'Разбираем типы домашних зарядных станций, требования к проводке и что нужно согласовать с управляющей компанией.',
        coverUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80',
        content: `
          <h2>Типы домашних зарядок</h2>
          <p><strong>Type 2 (AC, 7–22 кВт)</strong> — стандарт для большинства европейских и китайских EV. Заряжает Tesla, BYD, Zeekr, Evolute. За ночь заряжает любой EV с 20% до 80%.</p>
          <p><strong>GB/T (AC)</strong> — стандарт для некоторых китайских авто старых моделей. Если ваш автомобиль 2022+ года — скорее всего поддерживает Type 2.</p>
          <h2>Требования к электрике</h2>
          <p>Для зарядки 7 кВт нужна однофазная линия 32А. Для 11–22 кВт — трёхфазная линия 16–32А. Обязательно УЗО и автомат нужного номинала.</p>
          <h2>Согласование с УК</h2>
          <p>С 2023 года управляющие компании обязаны согласовывать установку зарядных станций в подземных паркингах жилых домов. Мы помогаем с оформлением документов.</p>
          <h2>Наши услуги</h2>
          <p>Подбираем, устанавливаем и настраиваем домашние зарядные станции. Гарантия на монтаж 3 года. Выезд мастера по Москве и МО.</p>
        `,
        isPublished: true,
        publishedAt: new Date('2026-06-20'),
      },
      {
        title: 'Что делать если электромобиль не заряжается: чеклист',
        slug: 'ev-ne-zaryazhaetsya-cheklistt-' + (Date.now() + 3).toString(36),
        excerpt: 'Пошаговый алгоритм диагностики — от простых причин до серьёзных неисправностей.',
        coverUrl: 'https://images.unsplash.com/photo-1617886903355-9354bb57751f?w=800&q=80',
        content: `
          <h2>Шаг 1: проверьте очевидное</h2>
          <ul>
            <li>Кабель плотно подключён с обеих сторон?</li>
            <li>Зарядная станция работает (нет ошибок на дисплее)?</li>
            <li>Зарядный порт автомобиля не заблокирован?</li>
            <li>Температура батареи в допустимом диапазоне (-10°C до +45°C)?</li>
          </ul>
          <h2>Шаг 2: проверьте настройки</h2>
          <ul>
            <li>В приложении автомобиля не установлено ограничение по времени зарядки?</li>
            <li>Уровень заряда не достиг установленного максимума (например 80%)?</li>
            <li>Не активирован режим «только AC» при подключении DC зарядки?</li>
          </ul>
          <h2>Шаг 3: попробуйте другую станцию</h2>
          <p>Если на другой станции зарядка работает — проблема в конкретной зарядке. Если нет — проблема в автомобиле.</p>
          <h2>Когда обращаться в сервис</h2>
          <p>Если ни один из шагов не помог, или в приложении появляется ошибка зарядной системы — приезжайте на диагностику. Мы определим причину за 30 минут.</p>
        `,
        isPublished: true,
        publishedAt: new Date('2026-06-10'),
      },
      {
        title: 'Зима на электромобиле: как подготовиться',
        slug: 'zima-na-elektromobile-podgotovka-' + (Date.now() + 4).toString(36),
        excerpt: 'Температура ниже нуля сокращает запас хода на 20–40%. Рассказываем как минимизировать потери и ездить комфортно зимой.',
        coverUrl: 'https://images.unsplash.com/photo-1647166545674-ce28ce93bdca?w=800&q=80',
        content: `
          <h2>Почему зимой меньше запас хода</h2>
          <p>Литий-ионные батареи при низкой температуре работают менее эффективно. Кроме того, обогрев салона потребляет 2–5 кВт — значительная часть запаса уходит на тепло.</p>
          <h2>Как подготовить автомобиль</h2>
          <ol>
            <li><strong>Предкондиционирование.</strong> Прогревайте салон пока автомобиль подключён к зарядке — так расход идёт не из батареи.</li>
            <li><strong>Зимние шины.</strong> Снижают потребление на 5–8% по сравнению с летними в зимних условиях.</li>
            <li><strong>Проверьте систему обогрева батареи.</strong> Большинство современных EV имеют тепловую помпу — убедитесь что она работает исправно.</li>
            <li><strong>Обновите прошивку.</strong> Производители регулярно выпускают обновления оптимизирующие зимнюю работу батареи.</li>
          </ol>
          <h2>Зимний сервис в нашем СТО</h2>
          <p>Предлагаем комплексную подготовку к зиме: проверка батареи, тепловой помпы, замена на зимние шины, обновление ПО. Запись по телефону или через форму.</p>
        `,
        isPublished: true,
        publishedAt: new Date('2026-05-25'),
      },
    ];

    for (const post of posts) {
      await prisma.providerPost.upsert({
        where: { providerId_slug: { providerId: provider.id, slug: post.slug } },
        update: {},
        create: { ...post, providerId: provider.id },
      });
    }
    console.log(`Демо-блог: добавлено ${posts.length} статей`);
  }
}

async function ensureDefaultNewsSources() {
  const defaults = [
    {
      name: 'Газета.ру — авто',
      feedUrl: 'https://www.gazeta.ru/export/rss/autonews.xml',
    },
    {
      name: 'РИА Новости — авто',
      feedUrl: 'https://ria.ru/export/rss2/auto/index.xml',   // специализированный авто-раздел
    },
    {
      name: 'Auto.Mail.ru',
      feedUrl: 'https://auto.mail.ru/rss/',
    },
    {
      name: 'ТАСС — авто',
      feedUrl: 'https://tass.ru/avtomobili/rss',
    },
    {
      name: 'Известия — авто',
      feedUrl: 'https://iz.ru/xml/rss/auto.xml',
    },
  ];

  for (const d of defaults) {
    await prisma.newsSource.upsert({
      where: { feedUrl: d.feedUrl },
      update: { name: d.name },
      create: {
        name: d.name,
        feedUrl: d.feedUrl,
        isEnabled: false,
      },
    });
  }

  // Удаляем нерабочие и нерелевантные ленты
  const deadFeeds = [
    'https://avtocharge.ru/feed/',
    'https://avtocharge.ru/novosti/feed/',
    'https://www.zr.ru/rss/tags/elektromobili-i-gibridy/',
    'https://www.autonews.ru/rss/',
    'https://auto.rbc.ru/rss/',
    'https://zr.ru/rss/all/',
    'https://www.zr.ru/rss/all/',
    'https://www.autonews.ru/rss/news.xml',
    'https://ria.ru/export/rss2/auto/index.xml',
    'https://www.kommersant.ru/RSS/section-auto.xml',
    'https://motor.ru/rss/',
    'https://www.drive.ru/rss/all.rss',
    'https://ria.ru/export/rss2/archive/index.xml', // общая лента — слишком много нерелевантного
    'https://tass.ru/rss/v2.xml',                   // общая лента — то же
  ];
  for (const url of deadFeeds) {
    await prisma.newsSource.deleteMany({ where: { feedUrl: url } }).catch(() => {});
  }

  console.log(`Источники новостей: обновлено (${defaults.length} шт.) — включи нужные в /admin`);
}

// ─── Категории сервисов и список EV-моделей ──────────────────────────────────

const SERVICE_CATEGORIES = [
  { name: 'СТО для электромобилей', slug: 'sto' },
  { name: 'Зарядные станции для дома', slug: 'zaryadki-dom' },
  { name: 'Установка зарядных станций', slug: 'ustanovka' },
  { name: 'Страхование EV', slug: 'strahovanie' },
  { name: 'Выкуп электромобилей', slug: 'vykup' },
  { name: 'Обучение вождению EV', slug: 'obuchenie' },
  { name: 'Аренда и каршеринг', slug: 'arenda' },
  { name: 'Тюнинг и аксессуары', slug: 'tyuning' },
];

export const EV_MODELS = [
  'BYD Atto 3', 'BYD Han', 'BYD Song Plus EV', 'BYD Seal', 'BYD Dolphin',
  'Zeekr 001', 'Zeekr 007', 'Zeekr X', 'Zeekr Mix',
  'NIO ET5', 'NIO ET7', 'NIO EL6', 'NIO EL7',
  'Xpeng P7', 'Xpeng G6', 'Xpeng G9',
  'Li Auto L6', 'Li Auto L7', 'Li Auto L8', 'Li Auto L9',
  'Avatr 11', 'Avatr 12',
  'Dongfeng Mengshi M-Hero 917',
  'Lixiang L6', 'Lixiang L7', 'Lixiang L8', 'Lixiang L9',
  'Voyah Free', 'Voyah Dream',
  'AITO M5', 'AITO M7', 'AITO M9',
  'Chery Omoda E5', 'Geely Galaxy E8',
  'Xiaomi SU7', 'Xiaomi SU7 Ultra',
  'IM L6', 'IM LS6',
  'Москвич 3е', 'Москвич 6е',
  'Evolute i-Pro', 'Evolute i-Joy', 'Evolute i-Van',
  'АМБЕРАВТО A5', 'EONYX E1', 'АТОМ',
  'Tesla Model 3', 'Tesla Model Y', 'Tesla Model S', 'Tesla Model X', 'Tesla Cybertruck',
  'Porsche Taycan', 'Audi e-tron GT', 'BMW iX', 'BMW i4', 'Mercedes EQS',
  'Hyundai IONIQ 5', 'Hyundai IONIQ 6', 'Kia EV6', 'Kia EV9',
  'Volkswagen ID.4', 'Volkswagen ID.7',
];

async function seedServiceCategories() {
  for (const cat of SERVICE_CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
  }
  console.log(`Категории сервисов: ${SERVICE_CATEGORIES.length} шт. готовы`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
