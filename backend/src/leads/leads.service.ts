import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateLeadDto, userId?: string) {
    const lead = await this.prisma.lead.create({
      data: { ...dto, userId, status: 'new' },
    });
    // Отправляем email партнёру и триггерим вебхуки асинхронно
    this.notifications.notifyPartnerNewLead(lead.id).catch(() => {});
    return lead;
  }

  async findByProvider(providerId: string) {
    return this.prisma.lead.findMany({
      where: { providerId },
      include: { history: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Изменение статуса с записью в историю
  async updateStatus(
    leadId: string,
    toStatus: string,
    note?: string,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error('Lead not found');

    const [updated] = await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: leadId },
        data: { status: toStatus as any },
        include: { history: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.leadHistory.create({
        data: { leadId, fromStatus: lead.status, toStatus: toStatus as any, note },
      }),
    ]);

    // Уведомляем через вебхук об изменении статуса
    this.notifications.notifyLeadStatusChanged(leadId, lead.status, toStatus).catch(() => {});

    return updated;
  }

  // Обновление заметки и даты следующего контакта
  async updateNote(leadId: string, partnerNote: string, nextFollowUp?: string) {
    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        partnerNote,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
      },
      include: { history: { orderBy: { createdAt: 'asc' } } },
    });
  }

  // Статистика воронки для дашборда
  async getFunnelStats(providerId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { providerId },
      select: { status: true, createdAt: true, updatedAt: true },
    });

    const total = leads.length;
    const byStatus = {
      new: 0, contacted: 0, qualified: 0, proposal: 0, converted: 0, rejected: 0,
    };
    leads.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });

    const converted = byStatus.converted;
    const conversion = total > 0 ? Math.round((converted / total) * 100) : 0;

    // Среднее время конверсии (от создания до converted)
    const convertedLeads = await this.prisma.lead.findMany({
      where: { providerId, status: 'converted' },
      include: {
        history: { where: { toStatus: 'converted' }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    });
    const avgDays = convertedLeads.length
      ? convertedLeads.reduce((sum, l) => {
          const convDate = l.history[0]?.createdAt ?? l.updatedAt;
          return sum + (convDate.getTime() - l.createdAt.getTime()) / 86400000;
        }, 0) / convertedLeads.length
      : 0;

    // Новые за последние 7 дней
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const newThisWeek = leads.filter(l => l.createdAt > weekAgo).length;

    return { total, byStatus, conversion, avgDays: Math.round(avgDays * 10) / 10, newThisWeek };
  }
}
