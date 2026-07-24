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

// Ключевые слова для фильтрации — новости без них не сохраняются.
// Регистронезависимо, проверяется в заголовке + описании.
const EV_KEYWORDS = [
  'электромобил', 'электрокар', 'электроавтомобил',
  'зарядн', 'зарядка', 'зарядить',
  'electric vehicle', 'ev ', ' ev,', ' ev.',
  'tesla', 'byd', 'zeekr', 'nio', 'xpeng', 'li auto',
  'атом', 'evolute', 'москвич 3е', 'амберавто', 'eonyx',
  'ocpp', 'ocpi', 'кВт·ч', 'квтч', 'kwh',
  'аккумулятор', 'батарея', 'литий',
  'гибрид', 'phev', 'plug-in',
  'инфраструктур зарядк', 'зарядная станц', 'зарядная инфраструктур',
  'россети', 'sitronics', '2chargers', 'ev-time',
];

function isEvRelated(title: string, description?: string): boolean {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  return EV_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
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

        // Фильтруем нерелевантные новости — сохраняем только про EV/зарядки
        if (!isEvRelated(item.title, item.description)) continue;

        const excerpt = this.makeExcerpt(item.description);

        await this.prisma.newsItem.upsert({
          where: { sourceUrl: item.link },
          // При повторном парсинге обновляем картинку если раньше не было
          update: item.enclosureUrl ? { imageUrl: item.enclosureUrl } : {},
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
        'User-Agent': 'Mozilla/5.0 (compatible; proev.ru-aggregator/1.0; +https://proev.ru)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
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

    // Убираем CDATA для простоты парсинга, но сохраняем namespace-префиксы
    // (они нужны для media:content, media:thumbnail и og:image)
    const clean = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, c) => c);

    // Пробуем найти items и в Atom-формате (entry) и RSS (item)
    const itemPattern = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
    const itemMatches = clean.matchAll(itemPattern);

    for (const match of itemMatches) {
      const block = match[1];
      // Нормализуем namespace-префиксы для удобного поиска
      const b = block
        .replace(/<([a-z]+):([a-zA-Z]+)/g, '<$1_$2')
        .replace(/<\/([a-z]+):([a-zA-Z]+)/g, '</$1_$2');

      const title = this.extractTag(b, 'title');
      const link =
        this.extractTag(b, 'link') ||
        this.extractAttr(b, 'link', 'href') ||
        this.extractAttr(b, 'guid', 'isPermaLink');
      const description =
        this.extractTag(b, 'description') ||
        this.extractTag(b, 'summary') ||
        this.extractTag(b, 'content_encoded') ||
        this.extractTag(b, 'content');
      const pubDate =
        this.extractTag(b, 'pubDate') ||
        this.extractTag(b, 'published') ||
        this.extractTag(b, 'updated');

      // Картинка — пробуем все возможные источники по убыванию приоритета:
      // 1. enclosure (стандарт RSS)
      // 2. media:content / media:thumbnail (Media RSS)
      // 3. og:image в description
      // 4. первый <img> тег в description
      const enclosureUrl =
        this.extractAttr(b, 'enclosure', 'url') ||
        this.extractAttr(b, 'media_content', 'url') ||
        this.extractAttr(b, 'media_thumbnail', 'url') ||
        this.extractAttr(b, 'media_group', 'url') ||
        (description ? this.extractImgFromHtml(description) : undefined);

      if (title && link) {
        items.push({ title, link, description, pubDate, enclosureUrl });
      }
    }

    return items;
  }

  // Вытаскиваем первую картинку из HTML-описания
  private extractImgFromHtml(html: string): string | undefined {
    // og:image в метатегах (иногда попадает в description)
    const ogMatch = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch) return ogMatch[1];

    // Первый img src — только реальные изображения, не иконки/пиксели
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|webp)[^"']*)["']/i);
    if (imgMatch) {
      const src = imgMatch[1];
      // Пропускаем маленькие счётчики и трекеры
      if (!src.includes('pixel') && !src.includes('track') && !src.includes('counter') &&
          !src.includes('1x1') && !src.includes('spacer')) {
        return src;
      }
    }
    return undefined;
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
      where: { status: 'approved' },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        excerpt: true,
        body: true,
        sourceUrl: true,
        sourceName: true,
        isOriginal: true,
        imageUrl: true,
        publishedAt: true,
      },
    });
  }

  async getOne(id: string) {
    return this.prisma.newsItem.findFirst({
      where: { id, status: 'approved' },
      select: {
        id: true,
        title: true,
        excerpt: true,
        body: true,
        sourceUrl: true,
        sourceName: true,
        isOriginal: true,
        imageUrl: true,
        publishedAt: true,
      },
    });
  }
}
