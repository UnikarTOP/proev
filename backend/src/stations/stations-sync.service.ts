import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5_000, 15_000, 45_000]; // 5s, 15s, 45s

// Запрос: все зарядные станции EV в России
const OVERPASS_QUERY = `
[out:json][timeout:60];
area["ISO3166-1"="RU"]->.ru;
(
  node["amenity"="charging_station"](area.ru);
  way["amenity"="charging_station"](area.ru);
);
out body center;
`;

function mapConnectors(tags: Record<string, string>): string[] {
  const connectors: string[] = [];
  if (tags['socket:chademo'])      connectors.push('CHAdeMO');
  if (tags['socket:type2'])        connectors.push('Type2');
  if (tags['socket:type2_combo'])  connectors.push('CCS2');
  if (tags['socket:type1'])        connectors.push('Type1');
  if (tags['socket:tesla_supercharger']) connectors.push('Tesla');
  if (tags['socket:gb_t'])         connectors.push('GB/T DC');
  if (connectors.length === 0 && tags['amenity'] === 'charging_station') {
    connectors.push('Type2'); // дефолт
  }
  return connectors;
}

function mapStatus(tags: Record<string, string>): string {
  if (tags['operational_status'] === 'broken') return 'broken';
  if (tags['operational_status'] === 'closed') return 'broken';
  if (tags['opening_hours']) return 'available';
  return 'unknown';
}

@Injectable()
export class StationsSyncService {
  private readonly logger = new Logger(StationsSyncService.name);
  private isSyncing = false;

  constructor(private prisma: PrismaService) {}

  // Запускаем сразу при старте (через 2 минуты чтобы база успела подняться)
  // и затем каждые 24 часа
  @Cron('0 3 * * *') // каждый день в 3:00 ночи
  async syncOsmScheduled() {
    if (this.isSyncing) {
      this.logger.warn('OSM sync уже запущен, пропускаем');
      return;
    }
    await this.syncOsm();
  }

  // Публичный метод для ручного запуска (из AdminJS или seed)
  async syncOsm(): Promise<{ created: number; updated: number; total: number }> {
    this.isSyncing = true;
    this.logger.log('Начинаем синхронизацию OSM Overpass...');

    let elements: any[] = [];

    // Retry с перебором зеркал
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const mirror = OVERPASS_MIRRORS[attempt % OVERPASS_MIRRORS.length];
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
          signal: AbortSignal.timeout(90_000),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        elements = data.elements || [];
        this.logger.log(`OSM: получено ${elements.length} объектов с ${mirror} (попытка ${attempt + 1})`);
        break; // успех — выходим из цикла retry

      } catch (err) {
        const msg = (err as Error).message;
        this.logger.warn(`OSM попытка ${attempt + 1}/${MAX_RETRIES} провалилась: ${msg}`);

        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt];
          this.logger.log(`Повторяем через ${delay / 1000}с...`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          this.logger.error('OSM sync: все попытки исчерпаны');
          this.isSyncing = false;
          return { created: 0, updated: 0, total: 0 };
        }
      }
    }

    // Сохраняем в БД батчами по 50
    let created = 0, updated = 0;
    const BATCH = 50;

    for (let i = 0; i < elements.length; i += BATCH) {
      const batch = elements.slice(i, i + BATCH);

      await Promise.allSettled(batch.map(async (el: any) => {
        const tags = el.tags || {};
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (!lat || !lon) return;

        const externalId = `osm:${el.type}:${el.id}`;
        const name = tags['name'] || tags['operator'] || 'Зарядная станция';
        const connectors = mapConnectors(tags);
        const status = mapStatus(tags);
        const powerKw = tags['maxpower']
          ? parseFloat(tags['maxpower'].replace(/[^\d.]/g, ''))
          : null;

        const data = {
          name,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || null,
          city: tags['addr:city'] || tags['addr:town'] || null,
          connectors,
          connectorTypes: connectors,
          powerKw: isNaN(powerKw!) ? null : powerKw,
          status: status as any,
          network: tags['network'] || tags['operator'] || null,
          externalId,
          verified: false,
          lastStatusUpdate: new Date(),
        };

        const existing = await this.prisma.chargingStation.findUnique({
          where: { externalId },
          select: { id: true },
        });

        if (existing) {
          await this.prisma.chargingStation.update({
            where: { externalId },
            data,
          });
          updated++;
        } else {
          await this.prisma.chargingStation.create({ data }).catch(() => { updated++; }); // игнорируем дубли
          created++;
        }
      }));
    }

    this.logger.log(`OSM sync завершён: создано ${created}, обновлено ${updated}`);
    this.isSyncing = false;
    return { created, updated, total: elements.length };
  }
}
