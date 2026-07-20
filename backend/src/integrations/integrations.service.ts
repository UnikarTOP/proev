import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CacheEntry {
  value: { apiKey: string | null; extraConfig: unknown; isEnabled: boolean } | null;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 1 минута — правки в админке подхватятся за минуту, без перезапуска сервера

@Injectable()
export class IntegrationsService {
  private cache = new Map<string, CacheEntry>();

  constructor(private prisma: PrismaService) {}

  /**
   * Возвращает API-ключ интеграции по стабильному ключу ('openchargemap',
   * 'yandex_maps', '2gis' и т.д.), или null, если не задан/выключен.
   */
  async getApiKey(key: string): Promise<string | null> {
    const integration = await this.getIntegration(key);
    if (!integration?.isEnabled) return null;
    return integration.apiKey ?? null;
  }

  async getIntegration(key: string) {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const integration = await this.prisma.integration.findUnique({ where: { key } });
    const value = integration
      ? { apiKey: integration.apiKey, extraConfig: integration.extraConfig, isEnabled: integration.isEnabled }
      : null;

    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }
}
