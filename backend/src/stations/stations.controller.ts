
// Расстояние от точки до прямой (в км)
function pointToLineDistance(lat: number, lon: number, p1: {lat:number,lon:number}, p2: {lat:number,lon:number}): number {
  const R = 6371;
  const haversine = (a: {lat:number,lon:number}, b: {lat:number,lon:number}) => {
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;
    const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const d12 = haversine(p1, p2);
  if (d12 < 0.1) return haversine({lat, lon}, p1);
  const d1p = haversine(p1, {lat, lon});
  const d2p = haversine(p2, {lat, lon});
  const cos = (d1p**2 + d12**2 - d2p**2) / (2 * d1p * d12);
  if (cos <= 0) return d1p;
  if (cos >= 1) return d2p;
  return d1p * Math.sqrt(1 - cos**2);
}

// Прогресс проекции точки на линию (0=начало, 1=конец)
function projectOnLine(lat: number, lon: number, p1: {lat:number,lon:number}, p2: {lat:number,lon:number}): number {
  const dx = p2.lon - p1.lon, dy = p2.lat - p1.lat;
  const t = ((lon - p1.lon)*dx + (lat - p1.lat)*dy) / (dx*dx + dy*dy);
  return Math.max(0, Math.min(1, t));
}

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

  @SkipThrottle()
  @Get('along-route')
  async getAlongRoute(
    @Query('lat1') lat1: string, @Query('lon1') lon1: string,
    @Query('lat2') lat2: string, @Query('lon2') lon2: string,
    @Query('radiusKm') radiusKm = '25', @Query('connector') connector?: string,
  ): Promise<any[]> {
    if (!lat1 || !lon1 || !lat2 || !lon2) return [];
    return this.stationsService.findAlongRoute({
      lat1: parseFloat(lat1), lon1: parseFloat(lon1),
      lat2: parseFloat(lat2), lon2: parseFloat(lon2),
      radiusKm: parseFloat(radiusKm) || 25,
      connector: connector || undefined,
    });
  }

}