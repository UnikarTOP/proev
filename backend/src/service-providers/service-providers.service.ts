import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceProvidersService {
  constructor(private prisma: PrismaService) {}

  findAll(params: { categorySlug?: string; city?: string }) {
    return this.prisma.serviceProvider.findMany({
      where: {
        isPublished: true,
        city: params.city ? { equals: params.city, mode: 'insensitive' } : undefined,
        category: params.categorySlug ? { slug: params.categorySlug } : undefined,
      },
      include: { category: true },
      orderBy: [
        { isPaidPlacement: 'desc' },
        { ratingAvg: 'desc' },
      ],
    });
  }

  // Находим по slug для страницы /services/[slug]
  async findBySlug(slug: string) {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { slug },
      include: {
        category: true,
        reviews: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!provider) throw new NotFoundException('Партнёр не найден');
    return provider;
  }

  async findOne(id: string) {
    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!provider) throw new NotFoundException('Партнёр не найден');
    return provider;
  }

  categories() {
    return this.prisma.serviceCategory.findMany();
  }

  // Добавляем отзыв и пересчитываем средний рейтинг
  async getReviews(providerId: string) {
    return this.prisma.providerReview.findMany({
      where: { providerId },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addReview(providerId: string, data: { rating: number; text?: string; authorId?: string }) {
    const review = await this.prisma.providerReview.create({
      data: {
        providerId,
        rating: data.rating,
        text: data.text,
        authorId: data.authorId,
      },
    });

    // Пересчёт среднего рейтинга
    const agg = await this.prisma.providerReview.aggregate({
      where: { providerId },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        ratingAvg: agg._avg.rating ?? null,
        reviewCount: agg._count,
      },
    });

    return review;
  }
  async incrementViews(providerId: string) {
    await this.prisma.serviceProvider.update({
      where: { id: providerId },
      data: {
        viewCount:     { increment: 1 },
        viewCountWeek: { increment: 1 },
      },
    });
  }

}