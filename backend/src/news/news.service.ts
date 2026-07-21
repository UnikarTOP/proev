import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// RSS-парсер — чистый JS без нативных зависимостей.
// Парсим XML вручную через regex — избегаем нативных модулей (были проблемы
// с bcrypt на этом сервере, держим зависимости максимально простыми).

interface ParsedItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  enclosureUrl?: string;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(private prisma: PrismaService) {}

  // Запускается каждые 2 часа — достаточно для новостного дайджеста,
  // не перегружает источники. Первый запуск — через 2 часа после старта,
  // не сразу (чтобы не мешать холодному старту контейнера).
  @Cron(CronExpression.EVERY_2_HOURS)
  async fetchAllSources() {
    const sources = await this.prisma.newsSource.findMany({
      where: { isEnabled: true },
    });

    this.logger.log(`Парсинг новостей: ${sources.length} источников`);

    for (const source of sources) {
      await this.fetchSource(source.id, source.feedUrl, source.name);
    }
  }

  // Можно вызвать вручную из контроллера (кнопка в AdminJS "Обновить сейчас")
  async fetchSource(sourceId: string, feedUrl: string, sourceName: string) {
    try {
      const items = await this.fetchRssFeed(feedUrl);
      let created = 0;

      for (const item of items) {
        if (!item.link || !item.title) continue;

        const excerpt = this.makeExcerpt(item.description);

        await this.prisma.newsItem.upsert({
          where: { sourceUrl: item.link },
          update: {},   // не обновляем уже сохранённые — idempotent
          create: {
            title: item.title.trim(),
            excerpt,
            sourceUrl: item.link,
            sourceName,
            imageUrl: item.enclosureUrl ?? null,
            publishedAt: item.pubDate ? new Date(item.pubDate) : null,
            status: 'pending', // всегда на модерацию — публикуется только после одобрения в /admin
            sourceId,
          },
        });
        created++;
      }

      await this.prisma.newsSource.update({
        where: { id: sourceId },
        data: { lastFetchedAt: new Date(), lastError: null },
      });

      this.logger.log(`${sourceName}: обработано ${items.length}, сохранено/обновлено ${created}`);
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(`Ошибка при парсинге ${feedUrl}: ${msg}`);
      await this.prisma.newsSource.update({
        where: { id: sourceId },
        data: { lastError: msg },
      });
    }
  }

  private async fetchRssFeed(feedUrl: string): Promise<ParsedItem[]> {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'proev.ru-news-aggregator/1.0 (+https://proev.ru)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const xml = await res.text();
    return this.parseRssXml(xml);
  }

  private parseRssXml(xml: string): ParsedItem[] {
    const items: ParsedItem[] = [];

    // Убираем CDATA и namespace-префиксы для простоты парсинга
    const clean = xml
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, content) => content)
      .replace(/<[a-z]+:/g, '<')
      .replace(/<\/[a-z]+:/g, '</');

    const itemMatches = clean.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const block = match[1];

      const title = this.extractTag(block, 'title');
      const link = this.extractTag(block, 'link') || this.extractAttr(block, 'guid', 'isPermaLink');
      const description = this.extractTag(block, 'description') || this.extractTag(block, 'summary');
      const pubDate = this.extractTag(block, 'pubDate') || this.extractTag(block, 'published') || this.extractTag(block, 'updated');
      const enclosureUrl = this.extractAttr(block, 'enclosure', 'url') || this.extractAttrTag(block, 'content', 'url');

      if (title && link) {
        items.push({ title, link, description, pubDate, enclosureUrl });
      }
    }

    return items;
  }

  private extractTag(xml: string, tag: string): string | undefined {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m ? m[1].trim() : undefined;
  }

  private extractAttr(xml: string, tag: string, attr: string): string | undefined {
    const m = xml.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i'));
    return m ? m[1] : undefined;
  }

  private extractAttrTag(xml: string, tag: string, attr: string): string | undefined {
    const m = xml.match(new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["'][^>]*>`, 'i'));
    return m ? m[1] : undefined;
  }

  // Выжимка: первые 200 символов описания, без HTML-тегов.
  // Полный текст НЕ копируем — это дайджест, а не перепечатка.
  private makeExcerpt(html?: string): string | undefined {
    if (!html) return undefined;
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return undefined;
    return text.length > 220 ? text.slice(0, 220).replace(/\s\S+$/, '…') : text;
  }

  // Публичный API для получения новостей (используется фронтендом)
  async getLatest(limit = 20, offset = 0) {
    return this.prisma.newsItem.findMany({
      where: { status: 'approved' }, // только прошедшие модерацию
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        excerpt: true,
        sourceUrl: true,
        sourceName: true,
        imageUrl: true,
        publishedAt: true,
      },
    });
  }

  // Для AdminJS — очередь на модерацию
  async getPending(limit = 50) {
    return this.prisma.newsItem.findMany({
      where: { status: 'pending' },
      orderBy: { fetchedAt: 'desc' },
      take: limit,
    });
  }
}
