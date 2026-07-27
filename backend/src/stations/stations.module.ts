import { Module } from '@nestjs/common';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';
import { StationsSyncService } from './stations-sync.service';

@Module({
  controllers: [StationsController],
  providers: [StationsService, StationsSyncService],
  exports: [StationsSyncService],
})
export class StationsModule {}
