import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStationDto } from './dto/create-station.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class StationsService {
  constructor(private prisma: PrismaService) {}

  findAll(params: { city?: string; connector?: string }) {
    return this.prisma.chargingStation.findMany({
      where: {
        city: params.city ? { equals: params.city, mode: 'insensitive' } : undefined,
        connectorTypes: params.connector ? { has: params.connector } : undefined,
      },
      include: { reviews: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }

  // Радиус-поиск (PostGIS). Требует raw SQL, т.к. Prisma не имеет нативной поддержки geography.
  async findNearby(lat: number, lng: number, radiusKm = 10) {
    return this.prisma.$queryRaw`
      SELECT *, (
        6371 * acos(
          cos(radians(${lat})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(latitude))
        )
      ) AS distance_km
      FROM "ChargingStation"
      HAVING distance_km <= ${radiusKm}
      ORDER BY distance_km ASC
      LIMIT 100;
    `;
  }

  async findOne(id: string) {
    const station = await this.prisma.chargingStation.findUnique({
      where: { id },
      include: { reviews: { orderBy: { createdAt: 'desc' } } },
    });
    if (!station) throw new NotFoundException('Станция не найдена');
    return station;
  }

  create(dto: CreateStationDto, userId?: string) {
    return this.prisma.chargingStation.create({
      data: {
        ...dto,
        chargingSpeed: (dto.chargingSpeed as any) ?? 'fast',
        connectorTypes: dto.connectorTypes ?? [],
        addedById: userId,
        verified: false,
      },
    });
  }

  async addReview(stationId: string, dto: CreateReviewDto, userId: string) {
    await this.findOne(stationId);
    const review = await this.prisma.stationReview.create({
      data: {
        stationId,
        userId,
        statusReport: dto.statusReport as any,
        comment: dto.comment,
        rating: dto.rating,
      },
    });
    // обновляем агрегированный статус станции по последнему отзыву
    await this.prisma.chargingStation.update({
      where: { id: stationId },
      data: { status: dto.statusReport as any },
    });
    return review;
  }
}
