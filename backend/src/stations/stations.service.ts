import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const STATUS_WEIGHT = {
  available: 3,
  occupied: 2,
  broken: 1,
  unknown: 0,
};

@Injectable()
export class StationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    lat?: number; lng?: number; radius?: number;
    status?: string; connector?: string; city?: string;
  }) {
    const where: any = {};

    if (params.status) where.status = params.status;
    if (params.city) where.city = { contains: params.city, mode: 'insensitive' };
    if (params.connector) where.connectors = { has: params.connector };

    const stations = await this.prisma.chargingStation.findMany({
      where,
      select: {
        id: true, name: true, latitude: true, longitude: true,
        address: true, city: true, status: true, connectors: true,
        powerKw: true, network: true, networkOperator: true,
        verified: true, reportCount: true, lastStatusUpdate: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { lastStatusUpdate: 'desc' },
      take: 2000,
    });

    // Фильтр по радиусу (если передан bbox)
    if (params.lat && params.lng && params.radius) {
      const R = 6371;
      return stations.filter(s => {
        const dLat = (s.latitude - params.lat!) * Math.PI / 180;
        const dLng = (s.longitude - params.lng!) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 +
          Math.cos(params.lat! * Math.PI/180) * Math.cos(s.latitude * Math.PI/180) *
          Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= params.radius!;
      });
    }

    return stations;
  }

  async findOne(id: string) {
    return this.prisma.chargingStation.findUnique({
      where: { id },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true, statusReport: true, comment: true, rating: true,
            waitMinutes: true, powerActual: true, connectorOk: true, createdAt: true,
          },
        },
        _count: { select: { reviews: true } },
      },
    });
  }

  async getReviews(stationId: string) {
    return this.prisma.stationReview.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, statusReport: true, comment: true, rating: true,
        waitMinutes: true, powerActual: true, connectorOk: true, createdAt: true,
      },
    });
  }

  async reportStatus(stationId: string, dto: {
    status: string; comment?: string; rating?: number;
    waitMinutes?: number; powerActual?: number; connectorOk?: string;
  }) {
    // Создаём репорт
    await this.prisma.stationReview.create({
      data: {
        stationId,
        statusReport: dto.status as any,
        comment: dto.comment,
        rating: dto.rating,
        waitMinutes: dto.waitMinutes,
        powerActual: dto.powerActual,
        connectorOk: dto.connectorOk,
      },
    });

    // Агрегируем последние 3 репорта за 6 часов — определяем актуальный статус
    const since = new Date(Date.now() - 6 * 3_600_000);
    const recent = await this.prisma.stationReview.findMany({
      where: { stationId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { statusReport: true },
    });

    let newStatus = dto.status;

    if (recent.length >= 2) {
      // Берём статус с наибольшим весом из последних репортов
      const counts: Record<string, number> = {};
      for (const r of recent) {
        counts[r.statusReport] = (counts[r.statusReport] || 0) + 1;
      }
      // Если 2+ одинаковых — применяем
      const dominant = Object.entries(counts).find(([, c]) => c >= 2);
      if (dominant) newStatus = dominant[0];
    }

    // Обновляем станцию
    const updated = await this.prisma.chargingStation.update({
      where: { id: stationId },
      data: {
        status: newStatus as any,
        lastStatusUpdate: new Date(),
        reportCount: { increment: 1 },
      },
    });

    return {
      ok: true,
      newStatus: updated.status,
      reportCount: updated.reportCount,
      message: recent.length >= 2
        ? `Статус подтверждён ${recent.length} репортами`
        : 'Репорт принят, ждём подтверждения',
    };
  }

  async getStats() {
    const [stationCount, cities] = await Promise.all([
      this.prisma.chargingStation.count(),
      this.prisma.chargingStation.groupBy({
        by: ['city'], where: { city: { not: null } }, _count: true,
      }),
    ]);
    return { stationCount, cityCount: cities.length };
  }
}
