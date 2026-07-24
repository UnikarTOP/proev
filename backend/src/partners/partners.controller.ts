import { Controller, Post, Get, Patch, Body, Param, Headers, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

class ApplyDto {
  @IsString() @MinLength(2) companyName: string;
  @IsString() city: string;
  @IsString() phone: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() website?: string;
}

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

class UpdateProviderDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() telegram?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() services?: string[];
  @IsOptional() brands?: string[];
  @IsOptional() photos?: string[];
  @IsOptional() @IsString() workingHours?: string;
  @IsOptional() yearFounded?: number;
  @IsOptional() isPublished?: boolean;
}

@Controller('partners')
export class PartnersController {
  constructor(private prisma: PrismaService) {}

  // ── Регистрация (подача заявки) ──────────────────────────────────────────

  @Post('apply')
  async apply(@Body() dto: ApplyDto) {
    const existing = await this.prisma.partnerApplication.findFirst({
      where: { email: dto.email, status: { in: ['pending', 'approved'] } },
    });
    if (existing) throw new BadRequestException('Заявка с этим email уже подана');

    const app = await this.prisma.partnerApplication.create({ data: dto });
    return { ok: true, applicationId: app.id };
  }

  // ── Статус заявки (партнёр проверяет по email) ───────────────────────────

  @Get('application-status/:email')
  async applicationStatus(@Param('email') email: string) {
    const app = await this.prisma.partnerApplication.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
    if (!app) return { status: 'not_found' };
    return {
      status: app.status,
      rejectionReason: app.rejectionReason,
      approvedAt: app.status === 'approved' ? app.updatedAt : null,
    };
  }

  // ── Вход в личный кабинет ────────────────────────────────────────────────

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash || user.role !== 'partner') {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный email или пароль');

    // Простой токен: base64(userId) — для MVP достаточно, в продакшне заменить на JWT
    const token = Buffer.from(`partner:${user.id}:${Date.now()}`).toString('base64');
    return { token, userId: user.id };
  }

  // ── Личный кабинет (все запросы с заголовком X-Partner-Token) ────────────

  private async resolvePartner(token: string) {
    if (!token) throw new UnauthorizedException('Требуется авторизация');
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const userId = decoded.split(':')[1];
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { managedProviders: { include: { category: true } } },
      });
      if (!user || user.role !== 'partner') throw new Error();
      return user;
    } catch {
      throw new UnauthorizedException('Недействительный токен');
    }
  }

  @Get('me')
  async getMe(@Headers('x-partner-token') token: string) {
    const user = await this.resolvePartner(token);
    const provider = user.managedProviders[0] || null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      provider,
    };
  }

  @Get('ev-models')
  getEvModels() {
    // Список EV-моделей для выбора брендов на лендинге
    const { EV_MODELS } = require('../../prisma/seed');
    return { models: EV_MODELS };
  }

  @Patch('provider')
  async updateProvider(
    @Headers('x-partner-token') token: string,
    @Body() dto: UpdateProviderDto,
  ) {
    const user = await this.resolvePartner(token);
    const provider = user.managedProviders[0];
    if (!provider) throw new NotFoundException('Лендинг ещё не создан — обратитесь в поддержку');

    const updated = await this.prisma.serviceProvider.update({
      where: { id: provider.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.tagline !== undefined && { tagline: dto.tagline }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.telegram !== undefined && { telegram: dto.telegram }),
        ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.services !== undefined && { services: dto.services }),
        ...(dto.brands !== undefined && { brands: dto.brands }),
        ...(dto.photos !== undefined && { photos: dto.photos }),
        ...(dto.workingHours !== undefined && { workingHours: dto.workingHours }),
        ...(dto.yearFounded !== undefined && { yearFounded: dto.yearFounded }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
      },
      include: { category: true },
    });
    return updated;
  }
}
