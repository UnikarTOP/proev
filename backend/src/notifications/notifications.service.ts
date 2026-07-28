import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  // ── Email ────────────────────────────────────────────────────────────────────

  private getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;

    return nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP не настроен — письмо не отправлено: ${subject} → ${to}`);
      return;
    }
    const from = process.env.SMTP_FROM || `proev.ru <${process.env.SMTP_USER}>`;
    try {
      await transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email отправлен: ${subject} → ${to}`);
    } catch (err) {
      this.logger.error(`Ошибка отправки email: ${(err as Error).message}`);
    }
  }

  // ── Уведомление партнёру о новой заявке ─────────────────────────────────────

  async notifyPartnerNewLead(leadId: string) {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: { provider: { include: { owner: true } } },
      });

      if (!lead) {
        this.logger.warn(`notifyPartnerNewLead: лид ${leadId} не найден`);
        return;
      }

      if (!lead.provider) {
        this.logger.warn(`notifyPartnerNewLead: у лида ${leadId} нет провайдера`);
        return;
      }

      const partnerEmail = lead.provider.owner?.email;
      if (!partnerEmail) {
        this.logger.warn(`notifyPartnerNewLead: у провайдера ${lead.provider.id} нет email владельца`);
        return;
      }

      const { name, phone, message, provider } = lead;
      const cabinetUrl = `${process.env.SITE_URL || 'https://proev.ru'}/partner/cabinet`;

      await this.sendEmail(
        partnerEmail,
        `Новая заявка от ${name} — proev.ru`,
        `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#10192B">
          <div style="font-size:22px;font-weight:700;margin-bottom:4px">proev<span style="color:#0BA5CC">.ru</span></div>
          <div style="font-size:12px;color:#6B7686;margin-bottom:24px">Платформа для владельцев электромобилей</div>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:16px">Новая заявка на вашей странице</h2>
          <div style="background:#F9F8F5;border-radius:12px;padding:16px 20px;margin-bottom:20px">
            <table style="width:100%;font-size:14px">
              <tr><td style="color:#6B7686;padding:6px 0;width:120px">Имя</td><td style="font-weight:500">${name}</td></tr>
              <tr><td style="color:#6B7686;padding:6px 0">Телефон</td><td><a href="tel:${phone}" style="color:#0BA5CC;font-weight:500">${phone}</a></td></tr>
              ${message ? `<tr><td style="color:#6B7686;padding:6px 0;vertical-align:top">Сообщение</td><td>${message}</td></tr>` : ''}
            </table>
          </div>
          <a href="${cabinetUrl}" style="display:inline-block;background:#0B1220;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;margin-bottom:24px">
            Открыть в кабинете →
          </a>
          <div style="font-size:12px;color:#B4B2A9;border-top:0.5px solid #DCE1E8;padding-top:16px">
            Страница сервиса: <a href="${process.env.SITE_URL || 'https://proev.ru'}/services/${provider.slug}" style="color:#0BA5CC">${provider.name}</a>
          </div>
        </div>
        `,
      );

      // Вебхуки
      this.triggerWebhooks(lead.provider.id, 'lead.created', {
        id: lead.id, name: lead.name, phone: lead.phone,
        message: lead.message, status: lead.status, createdAt: lead.createdAt,
      }).catch(e => this.logger.error('Webhook error:', e));

    } catch (err) {
      this.logger.error(`notifyPartnerNewLead ошибка: ${(err as Error).message}`);
    }
  }

  // ── Уведомление об изменении статуса ─────────────────────────────────────────

  async notifyLeadStatusChanged(leadId: string, fromStatus: string, toStatus: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { provider: true },
    });
    if (!lead) return;

    // Вебхук при изменении статуса
    this.triggerWebhooks(lead.providerId, 'lead.status_changed', {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      fromStatus,
      toStatus,
      updatedAt: lead.updatedAt,
    }).catch(e => this.logger.error('Webhook error:', e));
  }

  // ── Вебхуки ──────────────────────────────────────────────────────────────────

  async triggerWebhooks(providerId: string, event: string, payload: object) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { providerId, isActive: true, events: { has: event } },
    });

    for (const wh of webhooks) {
      try {
        const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
        // HMAC-SHA256 подпись — получатель может верифицировать подлинность
        const signature = crypto
          .createHmac('sha256', wh.secret)
          .update(body)
          .digest('hex');

        const res = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ProEV-Signature': `sha256=${signature}`,
            'X-ProEV-Event': event,
            'User-Agent': 'proev.ru-webhooks/1.0',
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        await this.prisma.webhook.update({
          where: { id: wh.id },
          data: {
            lastTriggeredAt: new Date(),
            lastError: res.ok ? null : `HTTP ${res.status}`,
          },
        });

        this.logger.log(`Webhook ${event} → ${wh.url}: ${res.status}`);
      } catch (err) {
        const msg = (err as Error).message;
        this.logger.error(`Webhook failed: ${wh.url} — ${msg}`);
        await this.prisma.webhook.update({
          where: { id: wh.id },
          data: { lastError: msg },
        });
      }
    }
  }

  @Cron('0 0 * * 0')
  async resetWeeklyViews() {
    await this.prisma.serviceProvider.updateMany({
      data: { viewCountWeek: 0 },
    });
    this.logger.log('Недельные счётчики просмотров сброшены');
  }
}


  // Проверяем истёкшие тарифы каждый день в 00:05
  @Cron('5 0 * * *')
  async checkExpiredPlans() {
    const expired = await this.prisma.serviceProvider.findMany({
      where: {
        planExpiresAt: { lt: new Date() },
        plan: { not: 'free' },
      },
      select: { id: true, name: true, plan: true },
    });

    for (const sp of expired) {
      await this.prisma.serviceProvider.update({
        where: { id: sp.id },
        data: {
          plan: 'free',
          isPaidPlacement: false,
          planExpiresAt: null,
        },
      });
      this.logger.log(`Тариф истёк: ${sp.name} (был ${sp.plan}) → сброшен до free`);
    }

    if (expired.length > 0) {
      this.logger.log(`Истёкших тарифов: ${expired.length}`);
    }
  }
