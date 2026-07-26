import {
  Controller, Post, UseInterceptors, UploadedFile,
  Headers, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_SIZE_MB = 5;

@Controller('upload')
export class UploadController {
  constructor(private prisma: PrismaService) {}

  private async resolvePartner(token: string) {
    if (!token) throw new UnauthorizedException('Требуется авторизация');
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const userId = decoded.split(':')[1];
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'partner') throw new Error();
      return user;
    } catch {
      throw new UnauthorizedException('Недействительный токен');
    }
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOAD_DIR,
      filename: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, unique);
      },
    }),
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      if (ALLOWED_EXTS.includes(ext)) cb(null, true);
      else cb(new BadRequestException(`Разрешены только: ${ALLOWED_EXTS.join(', ')}`), false);
    },
  }))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-partner-token') token: string,
  ) {
    await this.resolvePartner(token); // проверяем что партнёр авторизован

    if (!file) throw new BadRequestException('Файл не получен');

    const siteUrl = process.env.API_URL || process.env.SITE_URL?.replace('proev.ru', 'api.proev.ru') || 'https://api.proev.ru';
    const url = `${siteUrl}/uploads/${file.filename}`;

    return { ok: true, url, filename: file.filename };
  }
}
