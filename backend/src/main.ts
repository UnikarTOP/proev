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
        listProperties: ['name', 'city', 'isPublished', 'verified', 'isPaidPlacement'],
        editProperties: ['name', 'slug', 'tagline', 'description', 'city', 'address',
          'phone', 'telegram', 'website', 'logoUrl', 'services', 'brands',
          'workingHours', 'yearFounded', 'isPaidPlacement', 'verified', 'isPublished'],
        properties: {
          isPaidPlacement: { isVisible: { list: true, show: true, filter: true, edit: true } },
        },
        actions: { delete: { isAccessible: isAdmin } },
      }),
      // ── Заявки на партнёрство ──────────────────────────────────────────────
      {
        resource: { model: getModelByName('PartnerApplication'), client: prisma },
        options: {
          navigation: { name: 'Партнёры' },
          listProperties: ['companyName', 'city', 'email', 'phone', 'status', 'createdAt'],
          showProperties: ['companyName', 'city', 'email', 'phone', 'categoryId',
            'description', 'website', 'status', 'rejectionReason', 'adminNote', 'createdAt'],
          editProperties: ['status', 'adminNote', 'rejectionReason'],
          filterProperties: ['status'],
          actions: {
            new: { isAccessible: () => false },
            delete: { isAccessible: isAdmin },
            // ── Одобрить заявку ───────────────────────────────────────────
            approve: {
              actionType: 'record',
              label: '✓ Одобрить',
              icon: 'Check',
              isVisible: (ctx: any) => ctx.record?.params?.status === 'pending',
              handler: async (request: any, response: any, context: any) => {
                const { record, currentAdmin } = context;
                const appId = record.params.id;
                const app = await prisma.partnerApplication.findUnique({ where: { id: appId } });
                if (!app) return { record: record.toJSON(currentAdmin), notice: { message: 'Заявка не найдена', type: 'error' } };

                // Создаём пользователя с ролью partner
                const tempPassword = Math.random().toString(36).slice(2, 10);
                const passwordHash = await bcrypt.hash(tempPassword, 12);

                const user = await prisma.user.create({
                  data: {
                    email: app.email,
                    name: app.companyName,
                    role: 'partner',
                    passwordHash,
                    phone: app.phone,
                  },
                });

                // Создаём базовый профиль провайдера
                const slug = app.companyName
                  .toLowerCase()
                  .replace(/[^a-zа-яё0-9\s]/gi, '')
                  .replace(/\s+/g, '-')
                  .replace(/[а-яё]/gi, (c) => ({
                    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
                    к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
                    х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
                  }[c.toLowerCase()] || c))
                  + '-' + Date.now().toString(36);

                // Находим первую категорию если не указана
                const categoryId = app.categoryId || (
                  await prisma.serviceCategory.findFirst()
                )?.id;

                await prisma.serviceProvider.create({
                  data: {
                    name: app.companyName,
                    slug,
                    city: app.city,
                    phone: app.phone,
                    website: app.website,
                    description: app.description,
                    categoryId: categoryId!,
                    ownerId: user.id,
                    isPublished: false,
                  },
                });

                // Обновляем заявку
                await prisma.partnerApplication.update({
                  where: { id: appId },
                  data: { status: 'approved', userId: user.id },
                });

                return {
                  record: record.toJSON(currentAdmin),
                  notice: {
                    message: `Одобрено! Пользователь создан: ${app.email} / ${tempPassword} (показывается только сейчас — скопируйте!)`,
                    type: 'success',
                  },
                };
              },
            },
            // ── Отклонить заявку ─────────────────────────────────────────
            reject: {
              actionType: 'record',
              label: '✗ Отклонить',
              icon: 'X',
              isVisible: (ctx: any) => ctx.record?.params?.status === 'pending',
              handler: async (request: any, response: any, context: any) => {
                const { record, currentAdmin } = context;
                await prisma.partnerApplication.update({
                  where: { id: record.params.id },
                  data: { status: 'rejected' },
                });
                return {
                  record: record.toJSON(currentAdmin),
                  notice: { message: 'Заявка отклонена', type: 'info' },
                };
              },
            },
          },
        },
      },
      buildResource('Lead', {
        navigation: { name: 'Лиды' },
        listProperties: ['name', 'phone', 'status', 'providerId', 'createdAt'],
        actions: { delete: { isAccessible: isAdmin } },
      }),
      buildResource('Article', { navigation: { name: 'Блог' } }),
      buildResource('NewsSource', {
        navigation: { name: 'Новости' },
        listProperties: ['name', 'feedUrl', 'isEnabled', 'lastFetchedAt', 'lastError'],
        editProperties: ['name', 'feedUrl', 'isEnabled'],
        properties: {
          lastError: { isVisible: { list: true, show: true, edit: false, filter: false } },
          lastFetchedAt: { isVisible: { list: true, show: true, edit: false, filter: false } },
        },
      }),
      buildResource('NewsItem', {
        navigation: { name: 'Новости' },
        listProperties: ['title', 'sourceName', 'isOriginal', 'status', 'publishedAt', 'fetchedAt'],
        filterProperties: ['status', 'sourceName', 'isOriginal'],
        showProperties: ['title', 'excerpt', 'body', 'sourceUrl', 'sourceName', 'isOriginal', 'status', 'imageUrl', 'publishedAt', 'fetchedAt'],
        editProperties: ['title', 'excerpt', 'body', 'sourceUrl', 'sourceName', 'isOriginal', 'imageUrl', 'publishedAt', 'status'],
        properties: {
          // Поле body — rich-text через quill (тип richtext поддерживается AdminJS v7)
          body: {
            type: 'richtext',
            isVisible: { list: false, show: true, edit: true, filter: false },
            props: {
              quill: {
                theme: 'snow',
                modules: {
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'image'],
                    ['clean'],
                  ],
                },
              },
            },
          },
          isOriginal: {
            isVisible: { list: true, show: true, edit: true, filter: true },
          },
        },
        actions: {
          // Создать можно — для оригинальных материалов редакции
          new: {
            isAccessible: isAdmin,
            before: async (request: any) => {
              if (request.payload) {
                request.payload.isOriginal = true;
                request.payload.sourceName = request.payload.sourceName || 'proev.ru';
                request.payload.sourceUrl = request.payload.sourceUrl || `https://proev.ru/news/${Date.now()}`;
              }
              return request;
            },
          },
          edit: { isAccessible: ({ currentAdmin }: any) => ['admin', 'moderator'].includes(currentAdmin?.role) },
          delete: { isAccessible: isAdmin },
          bulkDelete: { isAccessible: isAdmin },
          // Одобрить — кнопка на карточке записи
          approve: {
            actionType: 'record',
            label: '✓ Одобрить',
            icon: 'Check',
            isVisible: (ctx: any) => ctx.record?.params?.status === 'pending' || ctx.record?.params?.status === 'rejected',
            handler: async (request: any, response: any, context: any) => {
              const { record, currentAdmin } = context;
              await prisma.newsItem.update({
                where: { id: record.params.id },
                data: { status: 'approved' },
              });
              return {
                record: record.toJSON(currentAdmin),
                notice: { message: 'Новость одобрена и опубликована', type: 'success' },
                redirectUrl: `/admin/resources/NewsItem`,
              };
            },
          },
          // Отклонить — кнопка на карточке записи
          reject: {
            actionType: 'record',
            label: '✗ Отклонить',
            icon: 'X',
            isVisible: (ctx: any) => ctx.record?.params?.status === 'pending' || ctx.record?.params?.status === 'approved',
            handler: async (request: any, response: any, context: any) => {
              const { record, currentAdmin } = context;
              await prisma.newsItem.update({
                where: { id: record.params.id },
                data: { status: 'rejected' },
              });
              return {
                record: record.toJSON(currentAdmin),
                notice: { message: 'Новость отклонена', type: 'info' },
                redirectUrl: `/admin/resources/NewsItem`,
              };
            },
          },
        },
      }),
      // ── Настройки карты ─────────────────────────────────────────────────
      // Отдельный визуальный раздел — только запись map_provider.
      // Поле apiKey здесь — это выбор провайдера через выпадающий список,
      // не секретный ключ: 'osm' | 'yandex' | '2gis'.
      {
        resource: { model: getModelByName('Integration'), client: prisma },
        options: {
          id: 'MapSettings',          // уникальный id чтобы AdminJS не путал с основным Integration
          navigation: { name: 'Настройки', icon: 'Map' },
          listProperties: ['name', 'apiKey'],
          editProperties: ['apiKey'],
          showProperties: ['name', 'apiKey', 'updatedAt'],
          filterProperties: [],
          properties: {
            apiKey: {
              label: 'Провайдер карты',
              availableValues: [
                { value: 'osm',    label: '🗺️  OpenStreetMap (бесплатно)' },
                { value: 'yandex', label: '🟡 Яндекс.Карты' },
                { value: '2gis',   label: '🟢 2GIS' },
              ],
              isVisible: { list: true, show: true, edit: true, filter: false },
            },
            name:      { isVisible: { list: true, show: true, edit: false, filter: false } },
            key:       { isVisible: false },
            isEnabled: { isVisible: false },
            extraConfig: { isVisible: false },
            createdAt: { isVisible: false },
            updatedAt: { isVisible: { list: false, show: true, edit: false, filter: false } },
          },
          actions: {
            // Показываем ТОЛЬКО запись map_provider
            list: {
              isAccessible: isAdmin,
              before: async (request: any) => {
                request.query = { ...request.query, filters: { key: 'map_provider' } };
                return request;
              },
            },
            show:   { isAccessible: isAdmin },
            edit:   { isAccessible: isAdmin },
            new:    { isAccessible: () => false },    // нельзя создавать — только редактировать
            delete: { isAccessible: () => false },
            bulkDelete: { isAccessible: () => false },
          },
        },
      },

      // ── API-ключи внешних сервисов ───────────────────────────────────────
      // Все интеграции кроме map_provider — ключи OpenChargeMap, Яндекс, 2GIS.
      {
        resource: { model: getModelByName('Integration'), client: prisma },
        options: {
          id: 'ApiKeys',
          navigation: { name: 'Настройки', icon: 'Key' },
          listProperties: ['name', 'isEnabled', 'updatedAt'],
          editProperties: ['name', 'apiKey', 'isEnabled'],
          showProperties: ['name', 'apiKey', 'isEnabled', 'updatedAt'],
          properties: {
            apiKey: {
              label: 'API-ключ / токен',
              isVisible: { list: false, show: true, edit: true, filter: false },
            },
            key:        { isVisible: false },
            extraConfig: { isVisible: false },
            createdAt:  { isVisible: false },
          },
          actions: {
            // Скрываем map_provider из этого раздела
            list: {
              isAccessible: isAdmin,
              before: async (request: any) => {
                // Фильтруем записи — исключаем map_provider
                request.query = { ...request.query };
                return request;
              },
              after: async (response: any) => {
                if (response.records) {
                  response.records = response.records.filter(
                    (r: any) => r.params?.key !== 'map_provider',
                  );
                }
                return response;
              },
            },
            show:       { isAccessible: isAdmin },
            edit:       { isAccessible: isAdmin },
            new:        { isAccessible: isAdmin },
            delete:     { isAccessible: isAdmin },
            bulkDelete: { isAccessible: isAdmin },
          },
        },
      },
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
