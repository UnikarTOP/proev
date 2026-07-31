import {
  Controller, Post, Get, Patch, Body, Headers,
  UnauthorizedException, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

interface JwtPayload { sub: string; email: string; role: string; }

@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  private verify(token: string) {
    if (!token) throw new UnauthorizedException('Токен не передан');
    try {
      return jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'change-me') as JwtPayload;
    } catch {
      throw new UnauthorizedException('Недействительный токен');
    }
  }

  // POST /api/users/register
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @Post('register')
  async register(@Body() body: { name: string; email: string; password: string }) {
    const { name, email, password } = body;
    if (!name || !email || !password) throw new BadRequestException('Заполните все поля');
    if (password.length < 8) throw new BadRequestException('Пароль минимум 8 символов');

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Email уже зарегистрирован');

    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, name, passwordHash: hash, role: 'user' },
      select: { id: true, email: true, name: true, role: true },
    });
    return { ok: true, user };
  }

  // POST /api/users/login
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    if (!email || !password) throw new BadRequestException('Заполните все поля');

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Неверный email или пароль');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'change-me',
      { expiresIn: '30d' }
    );
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  // GET /api/users/me
  @SkipThrottle()
  @Get('me')
  async getMe(@Headers('authorization') auth: string) {
    const payload = this.verify(auth);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, name: true, role: true,
        phone: true, city: true, bio: true,
        carBrand: true, carModel: true, carYear: true,
        carRange: true, connectorType: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  // PATCH /api/users/me
  @SkipThrottle()
  @Patch('me')
  async updateMe(
    @Headers('authorization') auth: string,
    @Body() body: {
      name?: string; phone?: string; city?: string; bio?: string;
      carBrand?: string; carModel?: string; carYear?: number;
      carRange?: number; connectorType?: string;
    }
  ) {
    const payload = this.verify(auth);
    const user = await this.prisma.user.update({
      where: { id: payload.sub },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.carBrand !== undefined && { carBrand: body.carBrand }),
        ...(body.carModel !== undefined && { carModel: body.carModel }),
        ...(body.carYear !== undefined && { carYear: body.carYear }),
        ...(body.carRange !== undefined && { carRange: body.carRange }),
        ...(body.connectorType !== undefined && { connectorType: body.connectorType }),
      },
      select: {
        id: true, email: true, name: true, phone: true,
        city: true, bio: true, carBrand: true, carModel: true,
        carYear: true, carRange: true, connectorType: true,
      },
    });
    return user;
  }

  // PATCH /api/users/password
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Patch('password')
  async changePassword(
    @Headers('authorization') auth: string,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    const payload = this.verify(auth);
    if (!body.currentPassword || !body.newPassword) throw new BadRequestException('Заполните все поля');
    if (body.newPassword.length < 8) throw new BadRequestException('Пароль минимум 8 символов');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.passwordHash) throw new NotFoundException();
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Неверный текущий пароль');

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash: await bcrypt.hash(body.newPassword, 10) },
    });
    return { ok: true };
  }
}
