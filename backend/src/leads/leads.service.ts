import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateLeadDto, userId?: string) {
    // TODO: здесь же можно отправлять уведомление партнёру (email/Telegram-бот)
    return this.prisma.lead.create({
      data: { ...dto, userId, status: 'new' },
    });
  }

  findByProvider(providerId: string) {
    return this.prisma.lead.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
