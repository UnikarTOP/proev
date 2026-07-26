import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ── OCPI 2.2.1 типы ──────────────────────────────────────────────────────────

interface OcpiToken {
  token: string;
  type: 'RFID' | 'APP_USER' | 'OTHER';
}

interface OcpiCredentials {
  token: string;         // наш токен который мы даём партнёру
  url: string;           // URL версий партнёра
  roles: { role: 'EMSP' | 'CPO'; party_id: string; country_code: string }[];
}

interface OcpiLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  coordinates: { latitude: string; longitude: string };
  evses: OcpiEvse[];
  last_updated: string;
}

interface OcpiEvse {
  uid: string;
  status: 'AVAILABLE' | 'BLOCKED' | 'CHARGING' | 'INOPERATIVE' | 'OUTOFORDER' | 'PLANNED' | 'REMOVED' | 'RESERVED' | 'UNKNOWN';
  connectors: OcpiConnector[];
  last_updated: string;
}

interface OcpiConnector {
  id: string;
  standard: 'CHADEMO' | 'IEC_62196_T1' | 'IEC_62196_T2' | 'IEC_62196_T2_COMBO' | 'DOMESTIC_F' | string;
  format: 'SOCKET' | 'CABLE';
  power_type: 'AC_1_PHASE' | 'AC_3_PHASE' | 'DC';
  max_voltage: number;
  max_amperage: number;
  max_electric_power?: number;
}

interface OcpiResponse<T> {
  data: T;
  status_code: number;
  status_message: string;
  timestamp: string;
}

// ── Маппинг OCPI → наш формат ────────────────────────────────────────────────

const CONNECTOR_MAP: Record<string, string> = {
  'CHADEMO':              'CHAdeMO',
  'IEC_62196_T2':        'Type2',
  'IEC_62196_T2_COMBO':  'CCS2',
  'IEC_62196_T1_COMBO':  'CCS1',
  'TESLA_S':             'Tesla',
  'GB_T_AC':             'GB/T AC',
  'GB_T_DC':             'GB/T DC',
};

const STATUS_MAP: Record<string, string> = {
  'AVAILABLE':    'available',
  'CHARGING':     'occupied',
  'BLOCKED':      'occupied',
  'RESERVED':     'occupied',
  'INOPERATIVE':  'broken',
  'OUTOFORDER':   'broken',
  'PLANNED':      'unknown',
  'REMOVED':      'unknown',
  'UNKNOWN':      'unknown',
};

@Injectable()
export class OcpiService {
  private readonly logger = new Logger(OcpiService.name);

  constructor(private prisma: PrismaService) {}

  // ── Низкоуровневый HTTP клиент ────────────────────────────────────────────

  private async ocpiGet<T>(
    url: string,
    token: string,
    params?: Record<string, string>,
  ): Promise<T[]> {
    const fullUrl = params
      ? `${url}?${new URLSearchParams(params)}`
      : url;

    const res = await fetch(fullUrl, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
        'X-Request-ID': crypto.randomUUID(),
        'X-Correlation-ID': crypto.randomUUID(),
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`OCPI HTTP ${res.status}: ${url}`);

    const body: OcpiResponse<T[]> = await res.json();
    if (body.status_code !== 1000) {
      throw new Error(`OCPI error ${body.status_code}: ${body.status_message}`);
    }

    return body.data;
  }

  // ── Handshake: получаем версии и эндпоинты партнёра ─────────────────────

  async discoverEndpoints(versionsUrl: string, token: string) {
    // Шаг 1: получаем список версий
    const versions = await this.ocpiGet<{ version: string; url: string }>(
      versionsUrl, token
    );

    // Выбираем 2.2.1, потом 2.2, потом 2.1.1
    const preferred = ['2.2.1', '2.2', '2.1.1'];
    const version = preferred
      .map(v => versions.find(x => x.version === v))
      .find(Boolean);

    if (!version) throw new Error(`Нет поддерживаемой версии OCPI. Доступны: ${versions.map(v => v.version).join(', ')}`);

    // Шаг 2: получаем эндпоинты для выбранной версии
    const detail = await this.ocpiGet<{ identifier: string; role: string; url: string }>(
      version.url, token
    );

    const endpoints: Record<string, string> = {};
    // detail может быть объектом с полем endpoints
    const endpointList = Array.isArray(detail) ? detail : (detail as any).endpoints || [];
    for (const ep of endpointList) {
      endpoints[ep.identifier] = ep.url;
    }

    this.logger.log(`OCPI handshake OK: версия ${version.version}, эндпоинты: ${Object.keys(endpoints).join(', ')}`);

    return { version: version.version, endpoints };
  }

  // ── Получаем все локации (зарядные станции) ──────────────────────────────

  async fetchLocations(
    locationsUrl: string,
    token: string,
    options: { dateFrom?: Date; limit?: number } = {},
  ): Promise<OcpiLocation[]> {
    const params: Record<string, string> = {
      limit: String(options.limit || 100),
    };
    if (options.dateFrom) {
      params.date_from = options.dateFrom.toISOString();
    }

    let all: OcpiLocation[] = [];
    let offset = 0;
    const pageSize = 100;

    while (true) {
      params.offset = String(offset);
      params.limit = String(pageSize);

      const res = await fetch(`${locationsUrl}?${new URLSearchParams(params)}`, {
        headers: {
          'Authorization': `Token ${token}`,
          'X-Request-ID': crypto.randomUUID(),
          'X-Correlation-ID': crypto.randomUUID(),
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) throw new Error(`OCPI locations HTTP ${res.status}`);

      const body: OcpiResponse<OcpiLocation[]> = await res.json();
      if (body.status_code !== 1000) break;

      const page = Array.isArray(body.data) ? body.data : [];
      all = all.concat(page);

      // Проверяем Link header для пагинации
      const link = res.headers.get('Link');
      if (!link || !link.includes('rel="next"') || page.length < pageSize) break;

      offset += pageSize;
      if (options.limit && all.length >= options.limit) break;
    }

    this.logger.log(`OCPI: получено ${all.length} локаций`);
    return all;
  }

  // ── Сохраняем/обновляем станции в БД ────────────────────────────────────

  async upsertLocations(locations: OcpiLocation[], source: string): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const loc of locations) {
      if (!loc.coordinates?.latitude || !loc.coordinates?.longitude) continue;

      const lat = parseFloat(loc.coordinates.latitude);
      const lng = parseFloat(loc.coordinates.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;

      // Определяем статус по EVSE
      const allStatuses = loc.evses?.flatMap(e => [e.status]) ?? [];
      const hasAvailable = allStatuses.includes('AVAILABLE');
      const hasCharging = allStatuses.includes('CHARGING');
      const allBroken = allStatuses.every(s => ['INOPERATIVE', 'OUTOFORDER', 'REMOVED'].includes(s));

      const status = allBroken ? 'broken' : hasAvailable ? 'available' : hasCharging ? 'occupied' : 'unknown';

      // Коллектим коннекторы
      const connectors = [
        ...new Set(
          loc.evses
            ?.flatMap(e => e.connectors?.map(c => CONNECTOR_MAP[c.standard] || c.standard) ?? [])
            ?? []
        )
      ];

      // Максимальная мощность
      const maxPower = Math.max(
        0,
        ...(loc.evses?.flatMap(e =>
          e.connectors?.map(c => c.max_electric_power ?? (c.max_voltage * c.max_amperage / 1000)) ?? []
        ) ?? [])
      );

      const externalId = `ocpi:${source}:${loc.id}`;

      const existing = await this.prisma.chargingStation.findFirst({
        where: { externalId: { equals: externalId } },
      });

      const data = {
        name: loc.name || `${loc.address}, ${loc.city}`,
        address: `${loc.address}, ${loc.city}`,
        latitude: lat,
        longitude: lng,
        status: status as any,
        connectors,
        connectorTypes: connectors,
        powerKw: maxPower > 0 ? maxPower : null,
        network: source,
        externalId,
        lastStatusUpdate: new Date(loc.last_updated),
      };

      if (existing) {
        await this.prisma.chargingStation.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await this.prisma.chargingStation.create({ data: { ...data, verified: false } });
        created++;
      }
    }

    this.logger.log(`OCPI upsert: создано ${created}, обновлено ${updated}`);
    return { created, updated };
  }

  // ── Полный цикл синхронизации с партнёром ───────────────────────────────

  async sync(partnerId: string): Promise<{ created: number; updated: number; locations: number }> {
    const integration = await this.prisma.integration.findUnique({
      where: { key: `ocpi_partner_${partnerId}` },
    });

    if (!integration?.apiKey) {
      throw new Error(`OCPI партнёр ${partnerId} не настроен. Добавьте key=ocpi_partner_${partnerId} в AdminJS → Интеграции`);
    }

    // Парсим конфиг из value JSON
    let config: { versionsUrl: string; token: string; locationsUrl?: string };
    try {
      config = JSON.parse(integration.value || '{}');
    } catch {
      throw new Error('Невалидный JSON в поле value интеграции OCPI');
    }

    if (!config.versionsUrl || !config.token) {
      throw new Error('В интеграции нужны: versionsUrl и token');
    }

    // Handshake если нет прямого URL локаций
    let locationsUrl = config.locationsUrl;
    if (!locationsUrl) {
      const { endpoints } = await this.discoverEndpoints(config.versionsUrl, config.token);
      locationsUrl = endpoints['locations'];
      if (!locationsUrl) throw new Error('Партнёр не предоставил эндпоинт locations');
    }

    // Инкрементальная синхронизация — только изменения с последнего запуска
    const lastSync = integration.lastFetchedAt;
    const locations = await this.fetchLocations(locationsUrl, config.token, {
      dateFrom: lastSync ? new Date(lastSync.getTime() - 60_000) : undefined, // -1 мин запас
    });

    const result = await this.upsertLocations(locations, partnerId);

    // Обновляем время последней синхронизации
    await this.prisma.integration.update({
      where: { key: `ocpi_partner_${partnerId}` },
      data: { lastFetchedAt: new Date(), lastError: null },
    });

    return { ...result, locations: locations.length };
  }
}
