import { Controller, Get } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('map-config')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  /**
   * GET /api/map-config
   * Возвращает настройки карты для фронтенда:
   * - provider: 'osm' | 'yandex' | '2gis'
   * - yandexApiKey: ключ Яндекс.Карт (если провайдер yandex)
   *
   * Ключ Яндекса передаём на клиент — это нормально для JS API Яндекса
   * (он привязан к домену, а не секретный). Менять провайдер и ключ можно
   * прямо из /admin -> Интеграции без передеплоя.
   */
  @Get()
  async getMapConfig() {
    const [providerIntegration, yandexIntegration] = await Promise.all([
      this.integrationsService.getIntegration('map_provider'),
      this.integrationsService.getIntegration('yandex_maps'),
    ]);

    const provider = providerIntegration?.apiKey?.trim() || 'osm';
    const yandexApiKey = yandexIntegration?.isEnabled ? yandexIntegration.apiKey : null;

    return { provider, yandexApiKey };
  }
}
