import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StationsService } from './stations.service';
import { StationsSyncService } from './stations-sync.service';

class ReportStatusDto {
  @IsEnum(['available', 'occupied', 'broken', 'unknown'])
  status: string;

  @IsOptional() @IsString()
  comment?: string;

  @IsOptional() @IsNumber() @Min(1) @Max(5)
  @Type(() => Number)
  rating?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(300)
  @Type(() => Number)
  waitMinutes?: number;

  @IsOptional() @IsNumber() @Min(1) @Max(500)
  @Type(() => Number)
  powerActual?: number;

  @IsOptional() @IsString()
  connectorOk?: string;
}

@Controller('stations')
export class StationsController {
  constructor(
    private readonly stationsService: StationsService,
    private readonly syncService: StationsSyncService,
  ) {}

  @SkipThrottle()
  @Get()
  findAll(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('status') status?: string,
    @Query('connector') connector?: string,
    @Query('city') city?: string,
  ) {
    return this.stationsService.findAll({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius: radius ? parseFloat(radius) : undefined,
      status, connector, city,
    });
  }

  @SkipThrottle()
  @Get('stats')
  getStats() {
    return this.stationsService.getStats();
  }

  @SkipThrottle()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stationsService.findOne(id);
  }

  @SkipThrottle()
  @Get(':id/reviews')
  getReviews(@Param('id') id: string) {
    return this.stationsService.getReviews(id);
  }

  // Репорт статуса — 10 в час с одного IP (защита от флуда)
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post(':id/report')
  reportStatus(@Param('id') id: string, @Body() dto: ReportStatusDto) {
    return this.stationsService.reportStatus(id, dto);
  }

  /** POST /api/stations/sync/osm — ручной запуск (только с локального IP) */
  @Post('sync/osm')
  syncOsm(@Req() req: any) {
    const ip = req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
    const allowed = ['127.0.0.1', '::1', '192.168.38.200', '::ffff:192.168.38.200'];
    if (!allowed.some(a => ip.includes(a))) {
      return { error: 'Forbidden' };
    }
    return this.syncService.syncOsm();
  }
}
