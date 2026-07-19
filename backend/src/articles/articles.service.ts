import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.article.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    if (!article) throw new NotFoundException('Статья не найдена');
    return article;
  }
}
