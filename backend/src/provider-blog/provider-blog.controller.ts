import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Headers, UnauthorizedException, NotFoundException,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength, Transform } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class CreatePostDto {
  @IsString() @MinLength(3) title: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() isPublished?: boolean;
}

class UpdatePostDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() isPublished?: boolean;
}

function slugify(text: string): string {
  const map: Record<string, string> = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
    к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
    х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  };
  return text.toLowerCase()
    .replace(/[а-яё]/g, c => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) + '-' + Date.now().toString(36);
}

@Controller('provider-blog')
export class ProviderBlogController {
  constructor(private prisma: PrismaService) {}

  private async resolvePartner(token: string) {
    if (!token) throw new UnauthorizedException('Требуется авторизация');
    try {
      const userId = Buffer.from(token, 'base64').toString().split(':')[1];
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { managedProviders: true },
      });
      if (!user || user.role !== 'partner') throw new Error();
      return user;
    } catch {
      throw new UnauthorizedException('Недействительный токен');
    }
  }

  // Публичное: все опубликованные посты партнёра
  @Get('public/:providerId')
  async publicPosts(@Param('providerId') providerId: string) {
    return this.prisma.providerPost.findMany({
      where: { providerId, isPublished: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  // Публичное: свежие статьи всех партнёров (для главной)
  @Get('latest')
  async latestPosts() {
    return this.prisma.providerPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: 6,
      include: { provider: { select: { name: true, slug: true, city: true } } },
    });
  }

  // Публичное: одна статья
  @Get('public/:providerId/:slug')
  async publicPost(@Param('providerId') providerId: string, @Param('slug') slug: string) {
    const post = await this.prisma.providerPost.findUnique({
      where: { providerId_slug: { providerId, slug } },
      include: { provider: { select: { name: true, slug: true } } },
    });
    if (!post || !post.isPublished) throw new NotFoundException('Статья не найдена');
    return post;
  }

  // Кабинет: все статьи партнёра
  @Get('my')
  async myPosts(@Headers('x-partner-token') token: string) {
    const user = await this.resolvePartner(token);
    const provider = user.managedProviders[0];
    if (!provider) throw new NotFoundException('Профиль не найден');
    return this.prisma.providerPost.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Кабинет: создать статью
  @Post('my')
  async createPost(@Headers('x-partner-token') token: string, @Body() dto: CreatePostDto) {
    const user = await this.resolvePartner(token);
    const provider = user.managedProviders[0];
    if (!provider) throw new NotFoundException('Профиль не найден');

    const isPublished = dto.isPublished === true;
    return this.prisma.providerPost.create({
      data: {
        providerId: provider.id,
        title: dto.title,
        slug: slugify(dto.title),
        excerpt: dto.excerpt,
        content: dto.content || '',
        coverUrl: dto.coverUrl,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
    });
  }

  // Кабинет: обновить статью
  @Patch('my/:id')
  async updatePost(
    @Headers('x-partner-token') token: string,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    const user = await this.resolvePartner(token);
    const provider = user.managedProviders[0];
    if (!provider) throw new NotFoundException('Профиль не найден');

    const post = await this.prisma.providerPost.findFirst({ where: { id, providerId: provider.id } });
    if (!post) throw new NotFoundException('Статья не найдена');

    const isPublished = dto.isPublished !== undefined ? dto.isPublished === true : post.isPublished;

    return this.prisma.providerPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
        ...(dto.isPublished !== undefined && {
          isPublished,
          publishedAt: isPublished && !post.isPublished ? new Date() : post.publishedAt,
        }),
      },
    });
  }

  // Кабинет: удалить статью
  @Delete('my/:id')
  async deletePost(@Headers('x-partner-token') token: string, @Param('id') id: string) {
    const user = await this.resolvePartner(token);
    const provider = user.managedProviders[0];
    if (!provider) throw new NotFoundException('Профиль не найден');
    await this.prisma.providerPost.deleteMany({ where: { id, providerId: provider.id } });
    return { ok: true };
  }
}
