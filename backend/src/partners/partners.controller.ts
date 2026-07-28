import {
  Controller, Post, Get, Patch, Body, Headers, Param,
  UnauthorizedException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationsService } from '../integrations/integrations.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

// ── DTO ──────────────────────────────────────────────────────────────────────

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

// ── JWT payload ───────────────────────────────────────────────────────────────

interface JwtPayload {
  sub: string;   // userId
  role: string;
  iat?: number;
  exp?: number;
}

@Controller('partners')
export class PartnersController {
  constructor(
    private prisma: PrismaService,
    private integrations: IntegrationsService,
    private jwt: JwtService,
  ) {}

  // ── Email утилита ─────────────────────────────────────────────────────────

  private async sendEmail(to: string, subject: string, html: string) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `proev.ru <${user}>`;

    if (!host || !user || !pass) {
      console.warn(`[Email] SMTP не настроен. Кому: ${to}, Тема: ${subject}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({ from, to, subject, html });
  }

  // ── JWT авторизация ───────────────────────────────────────────────────────

  private async resolvePartner(authHeader: string) {
    if (!authHeader) throw new UnauthorizedException('Требуется авторизация');

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader; // обратная совместимость со старым форматом

    // Пробуем JWT
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { managedProviders: { include: { category: true } } },
      });
      if (!user || user.role !== 'partner') throw new Error();
      return user;
    } catch {}

    // Обратная совместимость: старый base64 токен (временно, удалить в v0.3)
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const userId = decoded.split(':')[1];
      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { managedProviders: { include: { category: true } } },
        });
        if (user?.role === 'partner') return user;
      }
    } catch {}

    throw new UnauthorizedException('Недействительный или просроченный токен. Войдите заново.');
  }

  // ── Регистрация ───────────────────────────────────────────────────────────

  // Строже лимит на заявки: 3 / 10 минут с одного IP
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @Post('apply')
  async apply(@Body() dto: ApplyDto) {
    const existing = await this.prisma.partnerApplication.findFirst({
      where: { email: dto.email, status: { in: ['pending', 'approved'] } },
    });
    if (existing) throw new BadRequestException('Заявка с этим email уже подана');

    const app = await this.prisma.partnerApplication.create({ data: dto });
    return { ok: true, applicationId: app.id };
  }

  @Get('application-status/:email')
  async applicationStatus(@Param('email') email: string) {
    const app = await this.prisma.partnerApplication.findFirst({
      where: { email: decodeURIComponent(email) },
      orderBy: { createdAt: 'desc' },
    });
    if (!app) return { status: 'not_found' };
    return {
      status: app.status,
      approvedAt: app.status === 'approved' ? (app as any).updatedAt : null,
    };
  }

  // ── Вход — строгий rate limit: 10 попыток / 15 минут ─────────────────────

  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Намеренно одинаковые сообщения — не раскрываем существование email
    const invalid = new UnauthorizedException('Неверный email или пароль');

    if (!user?.passwordHash || user.role !== 'partner') throw invalid;

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw invalid;

    const payload: JwtPayload = { sub: user.id, role: user.role };
    const accessToken = this.jwt.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwt.sign(payload, { expiresIn: '30d' });

    return {
      accessToken,
      refreshToken,
      userId: user.id,
      // Для обратной совместимости с клиентом (удалить в v0.3)
      token: accessToken,
    };
  }

  // ── Обновление access token по refresh token ──────────────────────────────

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    try {
      const payload = this.jwt.verify<JwtPayload>(body.refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.role !== 'partner') throw new Error();

      const newPayload: JwtPayload = { sub: user.id, role: user.role };
      return {
        accessToken: this.jwt.sign(newPayload, { expiresIn: '7d' }),
      };
    } catch {
      throw new UnauthorizedException('Refresh token недействителен. Войдите заново.');
    }
  }

  // ── Профиль ───────────────────────────────────────────────────────────────

  @SkipThrottle()
  @Get('me')
  async getMe(@Headers('x-partner-token') token: string,
              @Headers('authorization') auth: string) {
    const user = await this.resolvePartner(token || auth);
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

  @SkipThrottle()
  @Patch('provider')
  async updateProvider(
    @Headers('x-partner-token') token: string,
    @Headers('authorization') auth: string,
    @Body() dto: UpdateProviderDto,
  ) {
    const user = await this.resolvePartner(token || auth);
    const provider = user.managedProviders[0];
    if (!provider) throw new NotFoundException('Профиль не найден');

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

  // ── Смена пароля авторизованным партнёром ────────────────────────────────

  @Post('change-password')
  async changePassword(
    @Headers('x-partner-token') token: string,
    @Headers('authorization') auth: string,
    @Body() dto: ChangePasswordDto,
  ) {
    const user = await this.resolvePartner(token || auth);
    if (!user.passwordHash) throw new BadRequestException('Пароль не установлен');

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Текущий пароль неверный');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
    });

    return { ok: true };
  }

  // ── Запрос сброса пароля по email ─────────────────────────────────────────

  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @Post('request-reset')
  async requestReset(@Body() dto: RequestResetDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Одинаковый ответ — не раскрываем наличие email
    const ok = { ok: true, message: 'Если email зарегистрирован, письмо отправлено' };

    if (!user || user.role !== 'partner') return ok;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 час

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
        <div style="font-size:20px;font-weight:700;margin-bottom:20px">
          proev<span style="color:#0BA5CC">.ru</span>
        </div>
        <h2 style="font-size:18px;font-weight:600;color:#10192B;margin-bottom:8px">
          Сброс пароля
        </h2>
        <p style="font-size:14px;color:#6B7686;line-height:1.6;margin-bottom:24px">
          Получили запрос на сброс пароля. Если вы не запрашивали — просто проигнорируйте письмо.
        </p>
        <a href="${resetUrl}"
          style="display:inline-block;background:#0B1220;color:#fff;text-decoration:none;
                 padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600">
          Сбросить пароль →
        </a>
        <p style="font-size:12px;color:#B4B2A9;margin-top:24px">
          Ссылка действует 1 час.
        </p>
      </div>
      `,
    );

    return ok;
  }

  @Get('reset-token-valid/:token')
  async checkResetToken(@Param('token') token: string) {
    const user = await this.prisma.user.findUnique({ where: { resetToken: token } });
    if (!user?.resetTokenExpiry) return { valid: false };
    if (user.resetTokenExpiry < new Date()) return { valid: false, expired: true };
    return { valid: true, email: user.email };
  }

  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { resetToken: dto.token } });

    if (!user?.resetTokenExpiry) throw new BadRequestException('Недействительная ссылка');
    if (user.resetTokenExpiry < new Date()) throw new BadRequestException('Ссылка устарела — запросите новую');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 12),
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { ok: true };
  }

  /** POST /api/partners/test-email — тест SMTP */
  @Post('test-email')
  async testEmail(@Body() body: { to: string }) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass) {
      return {
        ok: false,
        error: 'SMTP не настроен',
        vars: { SMTP_HOST: host || 'НЕТ', SMTP_USER: user || 'НЕТ', SMTP_PASS: pass ? '***' : 'НЕТ' },
      };
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
    });

    try {
      await transporter.verify();
      await transporter.sendMail({
        from, to: body.to,
        subject: 'Тест SMTP — proev.ru',
        html: '<p>Если вы получили это письмо — SMTP работает корректно ✅</p>',
      });
      return { ok: true, message: `Письмо отправлено на ${body.to}` };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
