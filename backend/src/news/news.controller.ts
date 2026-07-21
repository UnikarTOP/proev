import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { NewsService } from './news.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly prisma: PrismaService,
  ) {}

  // GET /api/news?limit=20&offset=0
  @Get()
  getLatest(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.newsService.getLatest(
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  // GET /api/news/:id
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.newsService.getOne(id);
  }

  // POST /api/news/fetch/:sourceId
  // Ручной тригер — кнопка "Обновить сейчас" в AdminJS или Postman-проверка.
  // TODO: добавить auth-guard (только admin) когда появится авторизация.
  @Post('fetch/:sourceId')
  async fetchNow(@Param('sourceId') sourceId: string) {
    const source = await this.prisma.newsSource.findUnique({
      where: { id: sourceId },
    });
    if (!source) return { error: 'Источник не найден' };

    await this.newsService.fetchSource(source.id, source.feedUrl, source.name);
    return { ok: true, message: `Источник "${source.name}" обновлён` };
  }
}
