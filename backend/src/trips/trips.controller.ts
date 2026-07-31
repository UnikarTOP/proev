import {
  Controller, Get, Post, Delete, Body, Headers, Param,
  UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import * as jwt from 'jsonwebtoken';

interface JwtPayload { sub: string; email: string; role: string; }

@Controller('trips')
export class TripsController {
  constructor(private prisma: PrismaService) {}

  private verify(auth: string): JwtPayload {
    if (!auth) throw new UnauthorizedException();
    try {
      return jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET || 'change-me') as JwtPayload;
    } catch { throw new UnauthorizedException('Недействительный токен'); }
  }

  // GET /api/trips — мои поездки
  @SkipThrottle()
  @Get()
  async getMyTrips(@Headers('authorization') auth: string) {
    const { sub } = this.verify(auth);
    return this.prisma.trip.findMany({
      where: { userId: sub },
      include: { station: { select: { id: true, name: true, address: true } } },
      orderBy: { visitedAt: 'desc' },
      take: 100,
    });
  }

  // GET /api/trips/stats — статистика
  @SkipThrottle()
  @Get('stats')
  async getStats(@Headers('authorization') auth: string) {
    const { sub } = this.verify(auth);
    const trips = await this.prisma.trip.findMany({ where: { userId: sub } });
    const totalKwh = trips.reduce((s, t) => s + (t.chargedKwh || 0), 0);
    const totalCost = trips.reduce((s, t) => s + (t.cost || 0), 0);
    const totalMin = trips.reduce((s, t) => s + (t.durationMin || 0), 0);
    const avgRating = trips.filter(t => t.rating).length > 0
      ? trips.reduce((s, t) => s + (t.rating || 0), 0) / trips.filter(t => t.rating).length
      : null;
    return {
      count: trips.length,
      totalKwh: Math.round(totalKwh * 10) / 10,
      totalCost: Math.round(totalCost),
      totalHours: Math.round(totalMin / 60 * 10) / 10,
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    };
  }

  // POST /api/trips — добавить поездку
  @Throttle({ default: { limit: 20, ttl: 3600_000 } })
  @Post()
  async addTrip(
    @Headers('authorization') auth: string,
    @Body() body: {
      stationId?: string; stationName?: string; city?: string;
      chargedKwh?: number; durationMin?: number; speedKw?: number;
      cost?: number; rating?: number; comment?: string; visitedAt?: string;
    }
  ) {
    const { sub } = this.verify(auth);
    if (!body.stationId && !body.stationName) throw new BadRequestException('Укажите станцию');
    if (body.rating && (body.rating < 1 || body.rating > 5)) throw new BadRequestException('Оценка от 1 до 5');

    return this.prisma.trip.create({
      data: {
        userId: sub,
        stationId: body.stationId || null,
        stationName: body.stationName || null,
        city: body.city || null,
        chargedKwh: body.chargedKwh || null,
        durationMin: body.durationMin || null,
        speedKw: body.speedKw || null,
        cost: body.cost || null,
        rating: body.rating || null,
        comment: body.comment || null,
        visitedAt: body.visitedAt ? new Date(body.visitedAt) : new Date(),
      },
    });
  }

  // DELETE /api/trips/:id
  @Delete(':id')
  async deleteTrip(@Headers('authorization') auth: string, @Param('id') id: string) {
    const { sub } = this.verify(auth);
    const trip = await this.prisma.trip.findFirst({ where: { id, userId: sub } });
    if (!trip) throw new BadRequestException('Поездка не найдена');
    await this.prisma.trip.delete({ where: { id } });
    return { ok: true };
  }
}
