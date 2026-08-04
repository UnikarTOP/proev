import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@Controller('articles')
export class ArticlesController {
  constructor(private prisma: PrismaService) {}

  // GET /api/articles — список опубликованных
  @SkipThrottle()
  @Get()
  async findAll(@Query('category') category?: string) {
    const where: any = { publishedAt: { not: null } };
    if (category) where.category = category;
    return this.prisma.article.findMany({
      where,
      select: {
        id: true, title: true, slug: true, description: true,
        category: true, readTime: true, coverImage: true,
        publishedAt: true, keywords: true,
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  // GET /api/articles/:slug — одна статья
  @SkipThrottle()
  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    return this.prisma.article.findUnique({
      where: { slug },
      select: {
        id: true, title: true, slug: true, description: true,
        content: true, category: true, readTime: true,
        coverImage: true, publishedAt: true, keywords: true,
        seoTitle: true, seoMeta: true,
      },
    });
  }

  // POST /api/articles — создать
  @Post()
  async create(@Body() body: any) {
    return this.prisma.article.create({
      data: {
        title: body.title,
        slug: body.slug || body.title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-|-$/g, ''),
        description: body.description || null,
        content: body.content || '',
        category: body.category || null,
        keywords: body.keywords || [],
        readTime: body.readTime ? parseInt(body.readTime) : null,
        coverImage: body.coverImage || null,
        seoTitle: body.seoTitle || null,
        publishedAt: body.published ? new Date() : null,
      },
    });
  }

  // PATCH /api/articles/:id — обновить
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.article.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description,
        content: body.content,
        category: body.category,
        keywords: body.keywords || [],
        readTime: body.readTime ? parseInt(body.readTime) : null,
        coverImage: body.coverImage,
        seoTitle: body.seoTitle,
        publishedAt: body.published ? (body.publishedAt ? new Date(body.publishedAt) : new Date()) : null,
      },
    });
  }

  // DELETE /api/articles/:id — удалить
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.article.delete({ where: { id } });
  }
}
