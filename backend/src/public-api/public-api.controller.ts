import {
  Controller, Get, Post, Delete, Body, Param,
  Headers, UnauthorizedException, ForbiddenException,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

// ── DTO ──────────────────────────────────────────────────────────────────────

class CreateWebhookDto {
  @IsUrl() url: string;
  @IsArray() @IsString({ each: true }) events: string[];
}

class CreateApiKeyDto {
  @IsString() name: string;
  @IsArray() @IsString({ each: true }) scopes: string[];
}

// ── Допустимые события и скоупы ──────────────────────────────────────────────

const VALID_EVENTS = [
  'lead.created',         // новая заявка
  'lead.status_changed',  // изменён статус заявки
  'review.created',       // новый отзыв
  'provider.published',   // страница опубликована
];

const VALID_SCOPES = [
  'leads:read',           // читать заявки
  'leads:write',          // создавать заявки (для внешних форм)
  'provider:read',        // читать данные профиля
  'reviews:read',         // читать отзывы
];

// ── Утилиты ──────────────────────────────────────────────────────────────────

function generateApiKey(): string {
  // Формат: pk_live_<32 random hex chars>
  return `pk_live_${crypto.randomBytes(16).toString('hex')}`;
}

function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

@Controller('public-api')
export class PublicApiController {
  constructor(private prisma: PrismaService) {}

  // ── Авторизация по токену партнёра ────────────────────────────────────────

  private async resolvePartner(token: string) {
    if (!token) throw new UnauthorizedException('Требуется X-Partner-Token');
    try {
      const userId = Buffer.from(token, 'base64').toString().split(':')[1];
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { managedProviders: true },
      });
      if (!user || user.role !== 'partner' || !user.managedProviders[0])
        throw new Error();
      return { user, provider: user.managedProviders[0] };
    } catch {
      throw new UnauthorizedException('Недействительный токен');
    }
  }

  // ── Авторизация по API-ключу ──────────────────────────────────────────────

  private async resolveApiKey(apiKey: string, requiredScope: string) {
    if (!apiKey?.startsWith('pk_live_'))
      throw new UnauthorizedException('Неверный формат API-ключа');

    const key = await this.prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { provider: true },
    });

    if (!key || !key.isActive)
      throw new UnauthorizedException('API-ключ не найден или отключён');

    if (!key.scopes.includes(requiredScope))
      throw new ForbiddenException(`Недостаточно прав. Требуется скоуп: ${requiredScope}`);

    // Обновляем время последнего использования
    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return key;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // WEBHOOKS
  // ════════════════════════════════════════════════════════════════════════════

  /** GET /api/public-api/webhooks — список вебхуков партнёра */
  @Get('webhooks')
  async listWebhooks(@Headers('x-partner-token') token: string) {
    const { provider } = await this.resolvePartner(token);
    return this.prisma.webhook.findMany({
      where: { providerId: provider.id },
      select: { id: true, url: true, events: true, isActive: true, lastError: true, lastTriggeredAt: true, createdAt: true },
    });
  }

  /** POST /api/public-api/webhooks — создать вебхук */
  @Post('webhooks')
  async createWebhook(
    @Headers('x-partner-token') token: string,
    @Body() dto: CreateWebhookDto,
  ) {
    const { provider } = await this.resolvePartner(token);

    const invalidEvents = dto.events.filter(e => !VALID_EVENTS.includes(e));
    if (invalidEvents.length)
      throw new BadRequestException(`Неизвестные события: ${invalidEvents.join(', ')}. Допустимые: ${VALID_EVENTS.join(', ')}`);

    const count = await this.prisma.webhook.count({ where: { providerId: provider.id } });
    if (count >= 5) throw new BadRequestException('Максимум 5 вебхуков на аккаунт');

    const secret = generateWebhookSecret();
    const webhook = await this.prisma.webhook.create({
      data: { providerId: provider.id, url: dto.url, events: dto.events, secret, isActive: true },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret, // показываем один раз при создании
      isActive: true,
      note: 'Сохраните секрет — он показывается только один раз. Используйте его для верификации X-ProEV-Signature.',
    };
  }

  /** DELETE /api/public-api/webhooks/:id — удалить вебхук */
  @Delete('webhooks/:id')
  async deleteWebhook(
    @Headers('x-partner-token') token: string,
    @Param('id') id: string,
  ) {
    const { provider } = await this.resolvePartner(token);
    await this.prisma.webhook.deleteMany({ where: { id, providerId: provider.id } });
    return { ok: true };
  }

  /** GET /api/public-api/webhooks/events — список доступных событий */
  @Get('webhooks/events')
  getEvents() {
    return {
      events: [
        { name: 'lead.created', description: 'Новая заявка от клиента' },
        { name: 'lead.status_changed', description: 'Изменён статус заявки в CRM' },
        { name: 'review.created', description: 'Клиент оставил отзыв' },
        { name: 'provider.published', description: 'Страница сервиса опубликована' },
      ],
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // API KEYS
  // ════════════════════════════════════════════════════════════════════════════

  /** GET /api/public-api/keys — список API-ключей */
  @Get('keys')
  async listKeys(@Headers('x-partner-token') token: string) {
    const { provider } = await this.resolvePartner(token);
    return this.prisma.apiKey.findMany({
      where: { providerId: provider.id },
      select: { id: true, name: true, key: true, scopes: true, isActive: true, lastUsedAt: true, createdAt: true },
    });
  }

  /** POST /api/public-api/keys — создать API-ключ */
  @Post('keys')
  async createKey(
    @Headers('x-partner-token') token: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    const { provider } = await this.resolvePartner(token);

    const invalidScopes = dto.scopes.filter(s => !VALID_SCOPES.includes(s));
    if (invalidScopes.length)
      throw new BadRequestException(`Неизвестные скоупы: ${invalidScopes.join(', ')}. Допустимые: ${VALID_SCOPES.join(', ')}`);

    const count = await this.prisma.apiKey.count({ where: { providerId: provider.id } });
    if (count >= 10) throw new BadRequestException('Максимум 10 API-ключей на аккаунт');

    const key = generateApiKey();
    const apiKey = await this.prisma.apiKey.create({
      data: { providerId: provider.id, name: dto.name, key, scopes: dto.scopes, isActive: true },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key, // показываем один раз
      scopes: apiKey.scopes,
      note: 'Сохраните ключ — он показывается только один раз.',
    };
  }

  /** DELETE /api/public-api/keys/:id — удалить ключ */
  @Delete('keys/:id')
  async deleteKey(
    @Headers('x-partner-token') token: string,
    @Param('id') id: string,
  ) {
    const { provider } = await this.resolvePartner(token);
    await this.prisma.apiKey.deleteMany({ where: { id, providerId: provider.id } });
    return { ok: true };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ПУБЛИЧНЫЙ API (по API-ключу)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/leads
   * Получить заявки провайдера
   * Заголовок: Authorization: Bearer pk_live_xxx
   */
  @Get('v1/leads')
  async getLeads(@Headers('authorization') auth: string) {
    const apiKey = auth?.replace('Bearer ', '').trim();
    const key = await this.resolveApiKey(apiKey, 'leads:read');

    const leads = await this.prisma.lead.findMany({
      where: { providerId: key.providerId },
      select: {
        id: true, name: true, phone: true, message: true,
        status: true, partnerNote: true, nextFollowUp: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { data: leads, total: leads.length };
  }

  /**
   * POST /api/v1/leads
   * Создать заявку из внешней системы (например, форма на своём сайте)
   * Заголовок: Authorization: Bearer pk_live_xxx
   */
  @Post('v1/leads')
  async createLeadExternal(
    @Headers('authorization') auth: string,
    @Body() body: { name: string; phone: string; message?: string; service?: string },
  ) {
    const apiKey = auth?.replace('Bearer ', '').trim();
    const key = await this.resolveApiKey(apiKey, 'leads:write');

    if (!body.name || !body.phone)
      throw new BadRequestException('Обязательные поля: name, phone');

    const lead = await this.prisma.lead.create({
      data: {
        providerId: key.providerId,
        name: body.name,
        phone: body.phone,
        message: [body.service, body.message].filter(Boolean).join(' — ') || null,
        status: 'new',
      },
    });

    return { ok: true, leadId: lead.id, status: lead.status };
  }

  /**
   * GET /api/v1/provider
   * Получить данные профиля провайдера
   */
  @Get('v1/provider')
  async getProvider(@Headers('authorization') auth: string) {
    const apiKey = auth?.replace('Bearer ', '').trim();
    const key = await this.resolveApiKey(apiKey, 'provider:read');

    const provider = await this.prisma.serviceProvider.findUnique({
      where: { id: key.providerId },
      select: {
        id: true, name: true, slug: true, tagline: true, city: true,
        address: true, phone: true, website: true, services: true,
        brands: true, workingHours: true, ratingAvg: true, reviewCount: true,
        isPublished: true, category: { select: { name: true, slug: true } },
      },
    });

    return { data: provider };
  }

  /**
   * GET /api/v1/reviews
   * Получить отзывы
   */
  @Get('v1/reviews')
  async getReviews(@Headers('authorization') auth: string) {
    const apiKey = auth?.replace('Bearer ', '').trim();
    const key = await this.resolveApiKey(apiKey, 'reviews:read');

    const reviews = await this.prisma.providerReview.findMany({
      where: { providerId: key.providerId },
      select: { id: true, rating: true, text: true, createdAt: true, author: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return { data: reviews };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ДОКУМЕНТАЦИЯ
  // ════════════════════════════════════════════════════════════════════════════

  /** GET /api/public-api/docs — краткая документация */
  @Get('docs')
  getDocs() {
    const base = process.env.SITE_URL?.replace('proev.ru', 'api.proev.ru') || 'https://api.proev.ru';
    return {
      version: '1.0',
      baseUrl: `${base}/api/v1`,
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer pk_live_xxx',
        note: 'Создайте API-ключ в кабинете партнёра → раздел API',
      },
      endpoints: [
        {
          method: 'GET', path: '/leads',
          scope: 'leads:read',
          description: 'Получить список заявок',
          response: '{ data: Lead[], total: number }',
        },
        {
          method: 'POST', path: '/leads',
          scope: 'leads:write',
          description: 'Создать заявку из внешней системы',
          body: '{ name: string, phone: string, message?: string, service?: string }',
          response: '{ ok: true, leadId: string, status: string }',
        },
        {
          method: 'GET', path: '/provider',
          scope: 'provider:read',
          description: 'Данные профиля партнёра',
          response: '{ data: Provider }',
        },
        {
          method: 'GET', path: '/reviews',
          scope: 'reviews:read',
          description: 'Отзывы клиентов',
          response: '{ data: Review[] }',
        },
      ],
      webhooks: {
        description: 'POST запросы на ваш URL при событиях',
        signature: 'Заголовок X-ProEV-Signature: sha256=<hmac> для верификации',
        events: VALID_EVENTS,
        scopes: VALID_SCOPES,
        example: {
          event: 'lead.created',
          payload: {
            id: 'uuid',
            name: 'Иван Иванов',
            phone: '+79001234567',
            message: 'Диагностика батареи Tesla',
            status: 'new',
            createdAt: '2026-07-25T12:00:00Z',
          },
          timestamp: '2026-07-25T12:00:00Z',
        },
      },
    };
  }
}
