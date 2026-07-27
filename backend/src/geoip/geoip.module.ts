import { Module } from '@nestjs/common';
import { GeoipController } from './geoip.controller';

@Module({ controllers: [GeoipController] })
export class GeoipModule {}
