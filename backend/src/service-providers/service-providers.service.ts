import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceProvidersService {
  constructor(private prisma: PrismaService) {}

  findAll(params: { categorySlug?: string; city?: string }) {
    return this.prisma.serviceProvider.findMany({
      where: {
        city: params.city ? { equals: params.city, mode: 'insensitive' } : undefined,
        category: params.categorySlug ? { slug: params.categorySlug } : undefined,
      },
      include: { category: true },
      orderBy: { isPaidPlacement: 'desc' }, // платные партнёры выше в выдаче
    });
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
}
