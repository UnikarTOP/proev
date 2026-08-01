import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@Controller('routes')
export class RoutesController {
  constructor(private prisma: PrismaService) {}

  // POST /api/routes — сохранить маршрут, получить короткий код
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  async saveRoute(@Body() body: {
    fromName: string; fromLat: number; fromLon: number;
    toName: string; toLat: number; toLon: number;
    distance: number; carBrand?: string; carModel?: string;
    consumption?: number; battery?: number; speed?: number;
    season?: string; chargeLevel?: number; stops?: number;
    totalTimeMin?: number; energyNeeded?: number;
  }) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const route = await this.prisma.savedRoute.create({
      data: {
        code,
        fromName: body.fromName,
        fromLat: body.fromLat,
        fromLon: body.fromLon,
        toName: body.toName,
        toLat: body.toLat,
        toLon: body.toLon,
        distance: body.distance,
        carBrand: body.carBrand || null,
        carModel: body.carModel || null,
        consumption: body.consumption || null,
        battery: body.battery || null,
        speed: body.speed || null,
        season: body.season || null,
        chargeLevel: body.chargeLevel || null,
        stops: body.stops || null,
        totalTimeMin: body.totalTimeMin || null,
        energyNeeded: body.energyNeeded || null,
      },
    });
    return { code: route.code, url: `https://proev.ru/route-planner?r=${route.code}` };
  }

  // GET /api/routes/:code — получить маршрут по коду
  @SkipThrottle()
  @Get(':code')
  async getRoute(@Param('code') code: string) {
    const route = await this.prisma.savedRoute.findUnique({ where: { code } });
    if (!route) throw new NotFoundException('Маршрут не найден');
    await this.prisma.savedRoute.update({ where: { code }, data: { views: { increment: 1 } } });
    return route;
  }
}
