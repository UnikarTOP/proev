import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class GeoipService implements OnModuleInit {
  private readonly logger = new Logger(GeoipService.name);

  async onModuleInit() {
    this.logger.log('GeoIP: используем ip-api.com (Sypex Geo пакет недоступен в npm)');
  }

  lookup(_ip: string): { city: string | null; country: string | null } {
    return { city: null, country: null };
  }
}
