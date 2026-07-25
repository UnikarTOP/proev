import {
  Controller, Post, Get, Patch, Body, Param,
  Headers, UnauthorizedException, NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

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

class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(6) newPassword: string;
}

class RequestResetDto {
  @IsEmail() email: string;
}

class ResetPasswordDto {
  @IsString() token: string;
  @IsString() @MinLength(6) newPassword: string;
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
  constructor(
    private prisma: PrismaService,
    private integrations: IntegrationsService,
  ) {}

  // ── Утилита: отправка email ──────────────────────────────────────────────

  private async sendEmail(to: string, subject: string, html: string) {
    // Берём SMTP-настройки из переменных окружения
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `proev.ru <${user}>`;

    if (!host || !user || !pass) {
      console.warn('[Email] SMTP не настроен — письмо не отправлено');
      console.warn(`[Email] Кому: ${to}, Тема: ${subject}`);
      // В dev-режиме просто логируем, не падаем
      return;
    }

    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({ from, to, subject, html });
  }

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

  // ── Статус заявки ────────────────────────────────────────────────────────

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

  // ── Вход ────────────────────────────────────────────────────────────────

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash || user.role !== 'partner') {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный email или пароль');

    const token = Buffer.from(`partner:${user.id}:${Date.now()}`).toString('base64');
    return { token, userId: user.id };
  }

  // ── Профиль партнёра ─────────────────────────────────────────────────────

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
    return { id: user.id, name: user.name, email: user.email, provider };
  }

  @Get('ev-models')
  getEvModels() {
    try {
      const seed = require('../../prisma/seed');
      return { models: seed.EV_MODELS || [] };
    } catch {
      return { models: [] };
    }
  }

  @Patch('provider')
  async updateProvider(
    @Headers('x-partner-token') token: string,
    @Body() dto: UpdateProviderDto,
  ) {
    const user = await this.resolvePartner(token);
    const provider = user.managedProviders[0];
    if (!provider) throw new NotFoundException('Лендинг ещё не создан');

    return this.prisma.serviceProvider.update({
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
  }

  // ── Смена пароля (авторизованный партнёр) ────────────────────────────────

  @Post('change-password')
  async changePassword(
    @Headers('x-partner-token') token: string,
    @Body() dto: ChangePasswordDto,
  ) {
    const user = await this.resolvePartner(token);
    if (!user.passwordHash) throw new BadRequestException('Пароль не установлен');

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Текущий пароль неверный');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return { ok: true, message: 'Пароль успешно изменён' };
  }

  // ── Запрос сброса пароля по email ─────────────────────────────────────────

  @Post('request-reset')
  async requestReset(@Body() dto: RequestResetDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Всегда отвечаем одинаково — не раскрываем наличие email в базе
    if (!user || user.role !== 'partner') {
      return { ok: true, message: 'Если этот email зарегистрирован, письмо отправлено' };
    }

    // Генерируем безопасный токен сброса (действует 1 час)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // +1 час

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const siteUrl = process.env.SITE_URL || 'https://proev.ru';
    const resetUrl = `${siteUrl}/partner/reset-password?token=${resetToken}`;

    await this.sendEmail(
      dto.email,
      'Сброс пароля — proev.ru',
      `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="font-size:20px;font-weight:600;color:#10192B;margin-bottom:8px">Сброс пароля</h2>
          <p style="font-size:14px;color:#6B7686;line-height:1.6;margin-bottom:24px">
            Получили запрос на сброс пароля для вашего аккаунта на proev.ru.<br>
            Если вы не запрашивали сброс — просто проигнорируйте это письмо.
          </p>
          <a href="${resetUrl}"
            style="display:inline-block;background:#0B1220;color:#fff;text-decoration:none;
                   padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600">
            Сбросить пароль →
          </a>
          <p style="font-size:12px;color:#B4B2A9;margin-top:24px">
            Ссылка действует 1 час.<br>
            proev.ru — платформа для владельцев электромобилей
          </p>
        </div>
      `,
    );

    return { ok: true, message: 'Если этот email зарегистрирован, письмо отправлено' };
  }

  // ── Проверка токена сброса ────────────────────────────────────────────────

  @Get('reset-token-valid/:token')
  async checkResetToken(@Param('token') token: string) {
    const user = await this.prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry) return { valid: false };
    if (user.resetTokenExpiry < new Date()) return { valid: false, expired: true };
    return { valid: true, email: user.email };
  }

  // ── Установка нового пароля по токену ─────────────────────────────────────

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { resetToken: dto.token } });

    if (!user || !user.resetTokenExpiry) {
      throw new BadRequestException('Недействительная ссылка для сброса пароля');
    }
    if (user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Ссылка устарела — запросите новую');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,     // инвалидируем токен после использования
        resetTokenExpiry: null,
      },
    });

    return { ok: true, message: 'Пароль успешно изменён — войдите с новым паролем' };
  }
}
