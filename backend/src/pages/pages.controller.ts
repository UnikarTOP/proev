import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@Controller('pages')
export class PagesController {
  constructor(private prisma: PrismaService) {}

  @SkipThrottle()
  @Get(':slug')
  async getPage(@Param('slug') slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || !page.isPublished) throw new NotFoundException('Страница не найдена');
    return page;
  }

  @SkipThrottle()
  @Get()
  async listPages() {
    return this.prisma.page.findMany({
      where: { isPublished: true },
      select: { slug: true, title: true, updatedAt: true },
    });
  }
}
