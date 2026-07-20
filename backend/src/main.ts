import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

// TypeScript при компиляции в CommonJS переписывает динамический import()
// в require() под капотом — а require() не может загрузить чистый ESM-пакет
// (вся экосистема AdminJS v7 — "type": "module"). new Function здесь —
// стандартный обходной приём: он прячет вызов import() от трансформации
// TS, и в рантайме остаётся настоящий нативный ESM-импорт, который Node
// умеет использовать даже из CommonJS-файла.
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<any>;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await mountAdmin(app);

  // /admin монтируется отдельно от общего API-префикса
  app.setGlobalPrefix('api', { exclude: ['admin', 'admin/(.*)'] });

  await app.listen(process.env.PORT || 3001);
}

/**
 * ВАЖНО: конкретные сигнатуры функций AdminJS/@adminjs/express
 * (buildAuthenticatedRouter и т.д.) я не мог проверить запуском в этой
 * песочнице — код написан по задокументированному паттерну, но если
 * версия пакета разойдётся в деталях API, сверься с README на npm.
 */
async function mountAdmin(app: any) {
  const AdminJSModule = await dynamicImport('adminjs');
  const AdminJS = AdminJSModule.default ?? AdminJSModule;
  const { Database, Resource, getModelByName } = await dynamicImport('@adminjs/prisma');
  const AdminJSExpressModule = await dynamicImport('@adminjs/express');
  const AdminJSExpress = AdminJSExpressModule.default ?? AdminJSExpressModule;

  AdminJS.registerAdapter({ Database, Resource });

  const prisma: PrismaService = app.get(PrismaService);

  function isAdmin({ currentAdmin }: any) {
    return currentAdmin?.role === 'admin';
  }

  function buildResource(modelName: string, options: Record<string, unknown> = {}) {
    return {
      resource: { model: getModelByName(modelName), client: prisma },
      options,
    };
  }

  const admin = new AdminJS({
    rootPath: '/admin',
    branding: {
      companyName: 'proev.ru — админка',
      withMadeWithLove: false,
    },
    resources: [
      buildResource('ChargingStation', {
        navigation: { name: 'Зарядные станции' },
        listProperties: ['name', 'city', 'status', 'verified', 'networkOperator'],
        editProperties: [
          'name', 'networkOperator', 'latitude', 'longitude', 'address', 'city',
          'connectorTypes', 'chargingSpeed', 'powerKw', 'priceInfo', 'status', 'verified',
        ],
        actions: {
          delete: { isAccessible: isAdmin },
          bulkDelete: { isAccessible: isAdmin },
        },
      }),
      buildResource('StationReview', {
        navigation: { name: 'Зарядные станции' },
        actions: { delete: { isAccessible: isAdmin } },
      }),
      buildResource('ServiceCategory', {
        navigation: { name: 'Сервисы' },
        actions: {
          new: { isAccessible: isAdmin },
          edit: { isAccessible: isAdmin },
          delete: { isAccessible: isAdmin },
        },
      }),
      buildResource('ServiceProvider', {
        navigation: { name: 'Сервисы' },
        properties: {
          isPaidPlacement: {
            isVisible: { list: true, show: true, filter: true, edit: false },
          },
        },
        actions: { delete: { isAccessible: isAdmin } },
      }),
      buildResource('Lead', {
        navigation: { name: 'Лиды' },
        listProperties: ['name', 'phone', 'status', 'providerId', 'createdAt'],
        actions: { delete: { isAccessible: isAdmin } },
      }),
      buildResource('Article', { navigation: { name: 'Блог' } }),
      buildResource('Integration', {
        navigation: { name: 'Интеграции' },
        listProperties: ['key', 'name', 'isEnabled', 'updatedAt'],
        editProperties: ['key', 'name', 'apiKey', 'extraConfig', 'isEnabled'],
        properties: {
          // Ключ показываем только на странице редактирования, не в общем списке —
          // чтобы не светился при простом просмотре таблицы.
          apiKey: { isVisible: { list: false, show: true, edit: true, filter: false } },
        },
        // Ключи внешних сервисов — зона ответственности только владельца.
        actions: {
          list: { isAccessible: isAdmin },
          show: { isAccessible: isAdmin },
          edit: { isAccessible: isAdmin },
          new: { isAccessible: isAdmin },
          delete: { isAccessible: isAdmin },
        },
      }),
      buildResource('User', {
        navigation: { name: 'Пользователи' },
        properties: { passwordHash: { isVisible: false } },
        actions: {
          list: { isAccessible: isAdmin },
          show: { isAccessible: isAdmin },
          edit: { isAccessible: isAdmin },
          new: { isAccessible: isAdmin },
          delete: { isAccessible: isAdmin },
        },
      }),
    ],
  });

  await admin.initialize?.();

  const router = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate: async (email: string, password: string) => {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!['admin', 'moderator'].includes(user.role)) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email ?? email, role: user.role };
      },
      cookieName: 'proev-admin',
      cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'change-me-in-env',
    },
    null,
    {
      resave: false,
      saveUninitialized: false,
      secret: process.env.ADMIN_SESSION_SECRET || 'change-me-in-env',
    },
  );

  app.use(admin.options.rootPath, router);
}

bootstrap();
