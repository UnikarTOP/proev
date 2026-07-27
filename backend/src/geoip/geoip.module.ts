import { Module } from '@nestjs/common';
import { GeoipController } from './geoip.controller';
import { GeoipService } from './geoip.service';

@Module({
  controllers: [GeoipController],
  providers: [GeoipService],
  exports: [GeoipService],
})
export class GeoipModule {}
