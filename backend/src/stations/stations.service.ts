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

  async findAlongRoute(params: { lat1: number; lon1: number; lat2: number; lon2: number; radiusKm: number; connector?: string }) {
    const { lat1, lon1, lat2, lon2, radiusKm: r } = params;
    const minLat = Math.min(lat1, lat2) - r / 111;
    const maxLat = Math.max(lat1, lat2) + r / 111;
    const minLon = Math.min(lon1, lon2) - r / (111 * Math.cos(lat1 * Math.PI / 180));
    const maxLon = Math.max(lon1, lon2) + r / (111 * Math.cos(lat1 * Math.PI / 180));
    const stations = await this.prisma.chargingStation.findMany({
      where: { latitude: { gte: minLat, lte: maxLat }, longitude: { gte: minLon, lte: maxLon } },
      select: { id: true, name: true, address: true, latitude: true, longitude: true, connectorTypes: true, status: true },
      take: 300,
    });
    const hav = (a: {lat:number,lon:number}, b: {lat:number,lon:number}) => {
      const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lon-a.lon)*Math.PI/180;
      const h=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
      return 2*R*Math.asin(Math.sqrt(h));
    };
    const p1={lat:lat1,lon:lon1}, p2={lat:lat2,lon:lon2};
    const d12=hav(p1,p2);
    return stations.map((s: any) => {
      const d1p=hav(p1,{lat:s.latitude,lon:s.longitude}), d2p=hav(p2,{lat:s.latitude,lon:s.longitude});
      const cos=(d1p**2+d12**2-d2p**2)/(2*d1p*d12);
      const dist=cos<=0?d1p:cos>=1?d2p:d1p*Math.sqrt(1-cos**2);
      const dx=p2.lon-p1.lon, dy=p2.lat-p1.lat;
      const progress=Math.max(0,Math.min(1,((s.longitude-p1.lon)*dx+(s.latitude-p1.lat)*dy)/(dx*dx+dy*dy)));
      return { ...s, distanceKm: Math.round(dist*10)/10, progress };
    }).filter((s: any) => s.distanceKm <= r && s.progress >= 0.02 && s.progress <= 0.98)
      .sort((a: any, b: any) => a.progress - b.progress);
  }

}