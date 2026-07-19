/**
 * Админка на AdminJS, смонтирована на /admin.
 *
 * ВАЖНО: пакеты adminjs/@adminjs/nestjs/@adminjs/prisma активно развиваются
 * и иногда меняют API между мажорными версиями. Код ниже написан по
 * задокументированному паттерну интеграции на момент написания, но перед
 * первым запуском (`npm install` требует интернета, которого нет в этой
 * песочнице) стоит свериться с README соответствующих пакетов на npm,
 * если что-то не соберётся.
 *
 * Роли:
 *  - admin     — полный доступ, включая пользователей и удаление записей
 *  - moderator — модерация станций/отзывов и работа с лидами, без доступа
 *                к пользователям и без права удаления
 */

import { Module } from '@nestjs/common';
import { AdminModule as AdminJSNestModule } from '@adminjs/nestjs';
import AdminJS from 'adminjs';
import { Database, Resource, getModelByName } from '@adminjs/prisma';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

AdminJS.registerAdapter({ Database, Resource });

// DMMF нужен адаптеру @adminjs/prisma, чтобы понимать схему моделей.
const dmmf = (Prisma as any).dmmf;

function isAdmin({ currentAdmin }: any) {
  return currentAdmin?.role === 'admin';
}

function buildResource(modelName: string, prisma: PrismaService, options: Record<string, unknown> = {}) {
  return {
    resource: { model: getModelByName(modelName, dmmf), client: prisma },
    options,
  };
}

@Module({
  imports: [
    PrismaModule,
    AdminJSNestModule.createAdminAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: async (prisma: PrismaService) => ({
        adminJsOptions: {
          rootPath: '/admin',
          branding: {
            companyName: 'proev.ru — админка',
            withMadeWithLove: false,
          },
          resources: [
            buildResource('ChargingStation', prisma, {
              navigation: { name: 'Зарядные станции' },
              listProperties: ['name', 'city', 'status', 'verified', 'networkOperator'],
              editProperties: [
                'name', 'networkOperator', 'latitude', 'longitude', 'address', 'city',
                'connectorTypes', 'chargingSpeed', 'powerKw', 'priceInfo', 'status', 'verified',
              ],
              actions: {
                // Удалять станции может только владелец — модератор только подтверждает/правит.
                delete: { isAccessible: isAdmin },
                bulkDelete: { isAccessible: isAdmin },
              },
            }),
            buildResource('StationReview', prisma, {
              navigation: { name: 'Зарядные станции' },
              actions: { delete: { isAccessible: isAdmin } },
            }),
            buildResource('ServiceCategory', prisma, {
              navigation: { name: 'Сервисы' },
              actions: {
                new: { isAccessible: isAdmin },
                edit: { isAccessible: isAdmin },
                delete: { isAccessible: isAdmin },
              },
            }),
            buildResource('ServiceProvider', prisma, {
              navigation: { name: 'Сервисы' },
              properties: {
                // Платное размещение напрямую влияет на выдачу и деньги —
                // решение уровня владельца, модератор это поле не трогает.
                isPaidPlacement: {
                  isVisible: { list: true, show: true, filter: true, edit: false },
                },
              },
              actions: {
                delete: { isAccessible: isAdmin },
              },
            }),
            buildResource('Lead', prisma, {
              navigation: { name: 'Лиды' },
              listProperties: ['name', 'phone', 'status', 'providerId', 'createdAt'],
              actions: {
                delete: { isAccessible: isAdmin },
              },
            }),
            buildResource('Article', prisma, { navigation: { name: 'Блог' } }),
            buildResource('User', prisma, {
              navigation: { name: 'Пользователи' },
              properties: { passwordHash: { isVisible: false } },
              // Пользователи и роли — только владелец.
              actions: {
                list: { isAccessible: isAdmin },
                show: { isAccessible: isAdmin },
                edit: { isAccessible: isAdmin },
                new: { isAccessible: isAdmin },
                delete: { isAccessible: isAdmin },
              },
            }),
          ],
        },
        auth: {
          authenticate: async (email: string, password: string) => {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user?.passwordHash) return null;
            if (!['admin', 'moderator'].includes(user.role)) return null;
            const ok = await bcrypt.compare(password, user.passwordHash);
            return ok ? user : null;
          },
          cookieName: 'proev-admin',
          cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'change-me-in-env',
        },
        sessionOptions: {
          resave: false,
          saveUninitialized: false,
          secret: process.env.ADMIN_SESSION_SECRET || 'change-me-in-env',
        },
      }),
    }),
  ],
})
export class AdminModule {}
