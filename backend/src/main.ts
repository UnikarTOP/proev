import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<any>;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads' });
  await mountAdmin(app);
  app.setGlobalPrefix('api', { exclude: ['admin', 'admin/(.*)'] });
  await app.listen(process.env.PORT || 3001);
}

async function mountAdmin(app: any) {
  const AdminJSModule = await dynamicImport('adminjs');
  const AdminJS = AdminJSModule.default ?? AdminJSModule;
  const { Database, Resource, getModelByName } = await dynamicImport('@adminjs/prisma');
  const AdminJSExpressModule = await dynamicImport('@adminjs/express');
  const AdminJSExpress = AdminJSExpressModule.default ?? AdminJSExpressModule;

  AdminJS.registerAdapter({ Database, Resource });

  const prisma: PrismaService = app.get(PrismaService);
  const isAdmin = ({ currentAdmin }: any) => currentAdmin?.role === 'admin';
  const isMod   = ({ currentAdmin }: any) => ['admin', 'moderator'].includes(currentAdmin?.role);

  const res = (modelName: string, opts: any = {}) => ({
    resource: { model: getModelByName(modelName), client: prisma },
    options: opts,
  });

  const admin = new AdminJS({
    rootPath: '/admin',
    branding: {
      companyName: 'proev.ru',
      logo: false,
      withMadeWithLove: false,
      favicon: '',
    },
    locale: {
      language: 'ru',
      availableLanguages: ['ru'],
      translations: {
        ru: {
          actions: {
            new:         'Создать',
            edit:        'Редактировать',
            show:        'Просмотр',
            delete:      'Удалить',
            bulkDelete:  'Удалить выбранные',
            list:        'Список',
          },
          buttons: {
            save:        'Сохранить',
            addNewItem:  'Добавить',
            filter:      'Фильтр',
            applyChanges: 'Применить',
            resetFilter: 'Сбросить',
            confirmRemovalMany: 'Удалить {{count}} записей',
            logout:      'Выйти',
          },
          labels: {
            navigation:       'Навигация',
            pages:            'Страницы',
            selectedRecords:  '{{count}} выбрано',
            filters:          'Фильтры',
            adminVersion:     'Admin v{{version}}',
            appVersion:       'proev.ru v0.1',
          },
          messages: {
            successfullyCreated:   'Запись создана',
            successfullyDeleted:   'Запись удалена',
            successfullyUpdated:   'Запись обновлена',
            thereWereValidationErrors: 'Ошибки валидации',
            forbiddenError: 'Нет доступа',
            anyForbiddenError: 'Нет доступа к этому действию',
            successfullyBulkDeleted: '{{count}} записей удалено',
            notFound: 'Запись не найдена',
            noRecordsSelected: 'Выберите записи',
            confirmDelete: 'Вы уверены?',
          },
          properties: {
            id:         'ID',
            createdAt:  'Создано',
            updatedAt:  'Обновлено',
            password:   'Пароль',
          },
        },
      },
    },
    resources: [

      // ═══════════════════════════════════════════════════════════════════════
      // ПАРТНЁРЫ
      // ═══════════════════════════════════════════════════════════════════════

      // ── Заявки на партнёрство ───────────────────────────────────────────
      {
        resource: { model: getModelByName('PartnerApplication'), client: prisma },
        options: {
          navigation: { name: '👥 Партнёры' },
          listProperties: ['companyName', 'city', 'email', 'phone', 'status', 'createdAt'],
          showProperties: ['companyName', 'city', 'email', 'phone', 'categoryId',
            'description', 'website', 'status', 'rejectionReason', 'adminNote', 'createdAt'],
          editProperties: ['status', 'adminNote', 'rejectionReason'],
          filterProperties: ['status'],
          properties: {
            companyName:     { label: 'Название компании' },
            city:            { label: 'Город' },
            email:           { label: 'Email' },
            phone:           { label: 'Телефон' },
            categoryId:      { label: 'Категория' },
            description:     { label: 'Описание' },
            website:         { label: 'Сайт' },
            status:          { label: 'Статус',
              availableValues: [
                { value: 'pending',  label: '⏳ На рассмотрении' },
                { value: 'approved', label: '✅ Одобрена' },
                { value: 'rejected', label: '❌ Отклонена' },
              ],
            },
            adminNote:       { label: 'Заметка администратора (внутренняя)' },
            rejectionReason: { label: 'Причина отказа (отправляется партнёру)' },
            createdAt:       { label: 'Дата заявки' },
          },
          actions: {
            new:    { isAccessible: () => false },
            delete: { isAccessible: isAdmin },
            // ── Одобрить заявку ────────────────────────────────────────────
            approve: {
              actionType: 'record',
              label: '✅ Одобрить',
              icon: 'Check',
              isVisible: (ctx: any) => ['pending', 'rejected'].includes(ctx.record?.params?.status),
              handler: async (request: any, _response: any, context: any) => {
                const { record, currentAdmin } = context;
                const app = await prisma.partnerApplication.findUnique({ where: { id: record.params.id } });
                if (!app) return { record: record.toJSON(currentAdmin), notice: { message: 'Заявка не найдена', type: 'error' } };

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

                const slug = app.companyName
                  .toLowerCase()
                  .replace(/[^a-zа-яё0-9\s]/gi, '')
                  .replace(/\s+/g, '-')
                  .replace(/[а-яё]/gi, (c: string) => ({
                    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
                    к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
                    х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
                  }[c] ?? c))
                  + '-' + Date.now().toString(36);

                const category = await prisma.serviceCategory.findFirst({
                  where: { id: app.categoryId ?? undefined },
                });

                await prisma.serviceProvider.create({
                  data: {
                    name: app.companyName,
                    slug,
                    city: app.city,
                    phone: app.phone,
                    website: app.website,
                    description: app.description,
                    categoryId: category?.id ?? (await prisma.serviceCategory.findFirst())?.id ?? '',
                    ownerId: user.id,
                    isPublished: false,
                  },
                });

                await prisma.partnerApplication.update({
                  where: { id: record.params.id },
                  data: { status: 'approved' },
                });

                // Отправляем email партнёру с паролем
                const siteUrl = process.env.SITE_URL || 'https://proev.ru';
                const cabinetUrl = `${siteUrl}/partner/cabinet`;
                const smtpHost = process.env.SMTP_HOST;
                const smtpUser = process.env.SMTP_USER;
                const smtpPass = process.env.SMTP_PASS;

                if (smtpHost && smtpUser && smtpPass) {
                  const nodemailerMod = await import('nodemailer');
                  const transporter = nodemailerMod.default.createTransport({
                    host: smtpHost,
                    port: parseInt(process.env.SMTP_PORT || '465'),
                    secure: parseInt(process.env.SMTP_PORT || '465') === 465,
                    auth: { user: smtpUser, pass: smtpPass },
                  });
                  await transporter.sendMail({
                    from: process.env.SMTP_FROM || `proev.ru <${smtpUser}>`,
                    to: app.email,
                    subject: 'Ваша заявка одобрена — proev.ru',
                    html: `
                    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#10192B">
                      <div style="font-size:22px;font-weight:700;margin-bottom:4px">
                        proev<span style="color:#0BA5CC">.ru</span>
                      </div>
                      <div style="font-size:12px;color:#6B7686;margin-bottom:28px">Платформа для владельцев электромобилей</div>

                      <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">🎉 Заявка одобрена!</h2>
                      <p style="font-size:14px;color:#6B7686;line-height:1.6;margin-bottom:24px">
                        Добро пожаловать в proev.ru! Ваш аккаунт создан.
                        Войдите в личный кабинет и заполните страницу своего сервиса.
                      </p>

                      <div style="background:#F9F8F5;border-radius:12px;padding:20px;margin-bottom:24px">
                        <table style="font-size:14px;width:100%">
                          <tr>
                            <td style="color:#6B7686;padding:6px 0;width:100px">Компания</td>
                            <td style="font-weight:500">${app.companyName}</td>
                          </tr>
                          <tr>
                            <td style="color:#6B7686;padding:6px 0">Email</td>
                            <td style="font-weight:500">${app.email}</td>
                          </tr>
                          <tr>
                            <td style="color:#6B7686;padding:6px 0">Пароль</td>
                            <td>
                              <code style="background:#fff;border:1px solid #DCE1E8;padding:4px 10px;border-radius:6px;font-size:16px;font-weight:600;letter-spacing:0.05em">
                                ${tempPassword}
                              </code>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <a href="${cabinetUrl}"
                        style="display:inline-block;background:#0B1220;color:#fff;text-decoration:none;
                               padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600;margin-bottom:24px">
                        Войти в кабинет →
                      </a>

                      <p style="font-size:13px;color:#6B7686;line-height:1.6;margin-bottom:8px">
                        <strong>Рекомендуем сразу:</strong>
                      </p>
                      <ol style="font-size:13px;color:#6B7686;line-height:1.8;padding-left:20px;margin-bottom:24px">
                        <li>Войдите с паролем выше и смените его на свой</li>
                        <li>Заполните профиль: фото, услуги, марки EV</li>
                        <li>Опубликуйте страницу — её увидят клиенты</li>
                      </ol>

                      <div style="font-size:12px;color:#B4B2A9;border-top:1px solid #DCE1E8;padding-top:16px">
                        Вопросы? Пишите: <a href="mailto:hello@proev.ru" style="color:#0BA5CC">hello@proev.ru</a>
                      </div>
                    </div>
                    `,
                  }).catch((e: Error) => console.error('Email ошибка:', e.message));
                }

                return {
                  record: record.toJSON(currentAdmin),
                  notice: {
                    message: `✅ Одобрено! Email с паролем отправлен на ${app.email}. Пароль: ${tempPassword}`,
                    type: 'success',
                  },
                };
              },
            },
            // ── Отклонить заявку ──────────────────────────────────────────
            reject: {
              actionType: 'record',
              label: '❌ Отклонить',
              icon: 'X',
              isVisible: (ctx: any) => ctx.record?.params?.status === 'pending',
              handler: async (request: any, _response: any, context: any) => {
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

      // ── Аккаунты партнёров ─────────────────────────────────────────────
      {
        resource: { model: getModelByName('User'), client: prisma },
        options: {
          id: 'PartnerAccounts',
          navigation: { name: '👥 Партнёры' },
          listProperties: ['name', 'email', 'phone', 'createdAt'],
          showProperties: ['name', 'email', 'role', 'phone', 'createdAt'],
          editProperties: ['name', 'email', 'phone'],
          filterProperties: ['role'],
          properties: {
            name:         { label: 'Название компании / ФИО' },
            email:        { label: 'Email для входа' },
            phone:        { label: 'Телефон' },
            role:         { label: 'Роль', isVisible: { edit: false, list: false, show: true, filter: true } },
            passwordHash: { isVisible: false },
            createdAt:    { label: 'Дата регистрации' },
          },
          actions: {
            new:    { isAccessible: isAdmin },
            delete: { isAccessible: isAdmin },
            list: {
              isAccessible: isAdmin,
              after: async (response: any) => {
                if (response.records) {
                  response.records = response.records.filter(
                    (r: any) => r.params?.role === 'partner',
                  );
                }
                return response;
              },
            },
            // ── Сгенерировать новый пароль ───────────────────────────────
            resetPassword: {
              actionType: 'record',
              label: '🔑 Новый пароль',
              icon: 'Key',
              isVisible: (ctx: any) => ctx.record?.params?.role === 'partner',
              handler: async (_req: any, _res: any, context: any) => {
                const { record, currentAdmin } = context;
                const newPassword = Math.random().toString(36).slice(2, 10);
                await prisma.user.update({
                  where: { id: record.params.id },
                  data: { passwordHash: await bcrypt.hash(newPassword, 12) },
                });
                return {
                  record: record.toJSON(currentAdmin),
                  notice: {
                    message: `Новый пароль: ${newPassword} — скопируйте и передайте партнёру!`,
                    type: 'success',
                  },
                };
              },
            },
          },
        },
      },

      // ── Профили сервисов ───────────────────────────────────────────────
      res('ServiceProvider', {
        navigation: { name: '👥 Партнёры' },
        listProperties: ['name', 'city', 'isPublished', 'verified', 'isPaidPlacement', 'createdAt'],
        editProperties: ['name', 'slug', 'tagline', 'description', 'city', 'address',
          'phone', 'email', 'telegram', 'website', 'logoUrl', 'workingHours',
          'yearFounded', 'isPaidPlacement', 'verified', 'isPublished'],
        filterProperties: ['isPublished', 'verified', 'isPaidPlacement', 'city'],
        properties: {
          name:            { label: 'Название' },
          slug:            { label: 'URL (slug)' },
          tagline:         { label: 'Слоган' },
          description:     { label: 'Описание' },
          city:            { label: 'Город' },
          address:         { label: 'Адрес' },
          phone:           { label: 'Телефон' },
          email:           { label: 'Email' },
          telegram:        { label: 'Telegram' },
          website:         { label: 'Сайт' },
          logoUrl:         { label: 'URL логотипа' },
          workingHours:    { label: 'Часы работы' },
          yearFounded:     { label: 'Год основания' },
          isPaidPlacement: { label: '💰 Платное размещение' },
          verified:        { label: '✅ Верифицирован' },
          isPublished:     { label: '🌐 Опубликован' },
          createdAt:       { label: 'Дата создания' },
        },
        actions: { delete: { isAccessible: isAdmin } },
      }),

      // ── Категории сервисов ─────────────────────────────────────────────
      res('ServiceCategory', {
        navigation: { name: '👥 Партнёры' },
        properties: {
          name: { label: 'Название категории' },
          slug: { label: 'URL-идентификатор' },
          icon: { label: 'Иконка (emoji или название)' },
        },
        actions: {
          new:    { isAccessible: isAdmin },
          edit:   { isAccessible: isAdmin },
          delete: { isAccessible: isAdmin },
        },
      }),

      // ═══════════════════════════════════════════════════════════════════════
      // ЗАЯВКИ (CRM)
      // ═══════════════════════════════════════════════════════════════════════

      res('Lead', {
        navigation: { name: '📩 Заявки' },
        listProperties: ['name', 'phone', 'status', 'providerId', 'createdAt'],
        showProperties: ['name', 'phone', 'message', 'status', 'partnerNote', 'nextFollowUp', 'providerId', 'createdAt', 'updatedAt'],
        editProperties: ['status', 'partnerNote', 'nextFollowUp'],
        filterProperties: ['status', 'providerId'],
        properties: {
          name:         { label: 'Имя клиента' },
          phone:        { label: 'Телефон' },
          message:      { label: 'Сообщение клиента' },
          status:       { label: 'Статус',
            availableValues: [
              { value: 'new',       label: '🔵 Новая' },
              { value: 'contacted', label: '🟡 Связались' },
              { value: 'qualified', label: '🟣 Квалификация' },
              { value: 'proposal',  label: '🟠 Предложение' },
              { value: 'converted', label: '🟢 Клиент' },
              { value: 'rejected',  label: '⚫ Отказ' },
            ],
          },
          partnerNote:  { label: 'Заметка партнёра' },
          nextFollowUp: { label: 'Следующий контакт' },
          providerId:   { label: 'ID сервиса' },
          createdAt:    { label: 'Получена' },
          updatedAt:    { label: 'Обновлена' },
        },
        actions: {
          new:    { isAccessible: () => false },
          delete: { isAccessible: isAdmin },
        },
      }),

      // ═══════════════════════════════════════════════════════════════════════
      // КАРТА И СТАНЦИИ
      // ═══════════════════════════════════════════════════════════════════════

      res('ChargingStation', {
        navigation: { name: '⚡ Карта' },
        listProperties: ['name', 'city', 'status', 'network', 'verified', 'updatedAt'],
        editProperties: ['name', 'address', 'city', 'latitude', 'longitude',
          'connectors', 'powerKw', 'status', 'network', 'verified'],
        filterProperties: ['status', 'verified', 'network', 'city'],
        properties: {
          name:       { label: 'Название' },
          address:    { label: 'Адрес' },
          city:       { label: 'Город' },
          latitude:   { label: 'Широта' },
          longitude:  { label: 'Долгота' },
          connectors: { label: 'Типы разъёмов' },
          powerKw:    { label: 'Мощность (кВт)' },
          network:    { label: 'Сеть/оператор' },
          status:     { label: 'Статус',
            availableValues: [
              { value: 'available', label: '🟢 Работает' },
              { value: 'occupied',  label: '🟡 Занята' },
              { value: 'broken',    label: '🔴 Неисправна' },
              { value: 'unknown',   label: '⚪ Неизвестно' },
            ],
          },
          verified:        { label: '✅ Верифицирована' },
          externalId:      { label: 'Внешний ID (OCPI)', isVisible: { list: false, show: true, edit: false, filter: false } },
          lastStatusUpdate:{ label: 'Обновлён статус' },
          createdAt:       { label: 'Добавлена' },
        },
        actions: { delete: { isAccessible: isAdmin }, bulkDelete: { isAccessible: isAdmin } },
      }),

      res('StationReview', {
        navigation: { name: '⚡ Карта' },
        listProperties: ['stationId', 'statusReport', 'comment', 'createdAt'],
        properties: {
          statusReport: { label: 'Статус',
            availableValues: [
              { value: 'available', label: '🟢 Работает' },
              { value: 'occupied',  label: '🟡 Занята' },
              { value: 'broken',    label: '🔴 Неисправна' },
            ],
          },
          stationId: { label: 'Станция' },
          comment:   { label: 'Комментарий' },
          createdAt: { label: 'Дата' },
        },
        actions: { delete: { isAccessible: isAdmin } },
      }),

      // ═══════════════════════════════════════════════════════════════════════
      // КОНТЕНТ
      // ═══════════════════════════════════════════════════════════════════════

      // ── Источники новостей ─────────────────────────────────────────────
      res('NewsSource', {
        navigation: { name: '📰 Контент' },
        listProperties: ['name', 'feedUrl', 'isEnabled', 'lastFetchedAt', 'lastError'],
        editProperties: ['name', 'feedUrl', 'isEnabled'],
        properties: {
          name:          { label: 'Название источника' },
          feedUrl:       { label: 'URL RSS-ленты' },
          isEnabled:     { label: '✅ Включён' },
          lastFetchedAt: { label: 'Последний парсинг', isVisible: { list: true, show: true, edit: false, filter: false } },
          lastError:     { label: 'Последняя ошибка', isVisible: { list: true, show: true, edit: false, filter: false } },
        },
      }),

      // ── Новости ────────────────────────────────────────────────────────
      res('NewsItem', {
        navigation: { name: '📰 Контент' },
        listProperties: ['title', 'sourceName', 'status', 'publishedAt'],
        filterProperties: ['status', 'sourceName'],
        showProperties: ['title', 'excerpt', 'sourceUrl', 'sourceName', 'status', 'imageUrl', 'publishedAt', 'fetchedAt'],
        editProperties: ['title', 'excerpt', 'sourceUrl', 'sourceName', 'imageUrl', 'publishedAt', 'status'],
        properties: {
          title:       { label: 'Заголовок' },
          excerpt:     { label: 'Анонс' },
          sourceUrl:   { label: 'Ссылка на источник' },
          sourceName:  { label: 'Источник' },
          imageUrl:    { label: 'URL картинки' },
          publishedAt: { label: 'Дата публикации' },
          fetchedAt:   { label: 'Получена', isVisible: { list: false, show: true, edit: false, filter: false } },
          status:      { label: 'Статус',
            availableValues: [
              { value: 'pending',  label: '⏳ На модерации' },
              { value: 'approved', label: '✅ Опубликована' },
              { value: 'rejected', label: '❌ Отклонена' },
            ],
          },
          body: { isVisible: false },
        },
        actions: {
          edit:   { isAccessible: isMod },
          delete: { isAccessible: isAdmin },
          bulkDelete: { isAccessible: isAdmin },
          approve: {
            actionType: 'record',
            label: '✅ Одобрить',
            isVisible: (ctx: any) => ['pending', 'rejected'].includes(ctx.record?.params?.status),
            handler: async (_req: any, _res: any, context: any) => {
              const { record, currentAdmin } = context;
              await prisma.newsItem.update({ where: { id: record.params.id }, data: { status: 'approved' } });
              return { record: record.toJSON(currentAdmin), notice: { message: 'Новость опубликована', type: 'success' } };
            },
          },
          reject: {
            actionType: 'record',
            label: '❌ Отклонить',
            isVisible: (ctx: any) => ['pending', 'approved'].includes(ctx.record?.params?.status),
            handler: async (_req: any, _res: any, context: any) => {
              const { record, currentAdmin } = context;
              await prisma.newsItem.update({ where: { id: record.params.id }, data: { status: 'rejected' } });
              return { record: record.toJSON(currentAdmin), notice: { message: 'Новость отклонена', type: 'info' } };
            },
          },
        },
      }),

      // ── Блог партнёров ─────────────────────────────────────────────────
      res('ProviderPost', {
        navigation: { name: '📰 Контент' },
        listProperties: ['title', 'providerId', 'isPublished', 'publishedAt', 'createdAt'],
        filterProperties: ['isPublished', 'providerId'],
        properties: {
          title:       { label: 'Заголовок' },
          excerpt:     { label: 'Анонс' },
          coverUrl:    { label: 'URL обложки' },
          isPublished: { label: '🌐 Опубликована' },
          publishedAt: { label: 'Дата публикации' },
          providerId:  { label: 'ID партнёра' },
          content:     { isVisible: false },
          slug:        { isVisible: { list: false, show: true, edit: false, filter: false } },
        },
        actions: {
          new:    { isAccessible: () => false },
          delete: { isAccessible: isAdmin },
        },
      }),

      // ── Отзывы на партнёров ────────────────────────────────────────────
      res('ProviderReview', {
        navigation: { name: '📰 Контент' },
        listProperties: ['providerId', 'rating', 'text', 'createdAt'],
        filterProperties: ['providerId', 'rating'],
        properties: {
          providerId: { label: 'ID партнёра' },
          rating:     { label: 'Оценка (1–5)' },
          text:       { label: 'Текст отзыва' },
          createdAt:  { label: 'Дата' },
        },
        actions: {
          new:    { isAccessible: () => false },
          delete: { isAccessible: isAdmin },
        },
      }),

      // ═══════════════════════════════════════════════════════════════════════
      // ПОЛЬЗОВАТЕЛИ
      // ═══════════════════════════════════════════════════════════════════════

      {
        resource: { model: getModelByName('User'), client: prisma },
        options: {
          navigation: { name: '👤 Пользователи' },
          listProperties: ['name', 'email', 'role', 'phone', 'createdAt'],
          showProperties: ['name', 'email', 'role', 'phone', 'createdAt'],
          filterProperties: ['role'],
          editProperties: ['name', 'email', 'role', 'phone'],
          properties: {
            passwordHash: { isVisible: false },
            resetToken:   { isVisible: false },
            resetTokenExpiry: { isVisible: false },
            name:         { label: 'Имя / Компания' },
            email:        { label: 'Email' },
            phone:        { label: 'Телефон' },
            role:         { label: 'Роль',
              availableValues: [
                { value: 'user',      label: 'Пользователь' },
                { value: 'partner',   label: 'Партнёр' },
                { value: 'moderator', label: 'Модератор' },
                { value: 'admin',     label: 'Администратор' },
              ],
            },
            createdAt:    { label: 'Зарегистрирован' },
          },
          actions: {
            list: { isAccessible: isAdmin },
            show: { isAccessible: isAdmin },
            new:  { isAccessible: isAdmin },
            edit: { isAccessible: isAdmin },
            delete: { isAccessible: isAdmin },
            bulkDelete: { isAccessible: isAdmin },
            changePassword: {
              actionType: 'record',
              label: '🔑 Сгенерировать пароль',
              icon: 'Key',
              isVisible: isAdmin,
              handler: async (_req: any, _res: any, context: any) => {
                const { record, currentAdmin } = context;
                const newPassword = Math.random().toString(36).slice(2, 10) +
                  Math.random().toString(36).slice(2, 6).toUpperCase();
                await prisma.user.update({
                  where: { id: record.params.id },
                  data: { passwordHash: await bcrypt.hash(newPassword, 12) },
                });
                return {
                  record: record.toJSON(currentAdmin),
                  notice: {
                    message: `Новый пароль: ${newPassword} — показывается один раз, скопируйте!`,
                    type: 'success',
                  },
                };
              },
            },
          },
        },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // ИНТЕГРАЦИИ
      // ═══════════════════════════════════════════════════════════════════════

      // ── Провайдер карты (отдельно — выпадающий список) ─────────────────
      {
        resource: { model: getModelByName('Integration'), client: prisma },
        options: {
          id: 'MapProvider',
          navigation: { name: '🔌 Интеграции' },
          listProperties: ['name', 'apiKey', 'updatedAt'],
          editProperties: ['apiKey'],
          showProperties: ['name', 'apiKey', 'updatedAt'],
          filterProperties: [],
          properties: {
            name:      { label: 'Настройка', isVisible: { list: true, show: true, edit: false, filter: false } },
            apiKey:    { label: 'Провайдер карты',
              availableValues: [
                { value: 'osm',    label: '🗺️  OpenStreetMap (бесплатно, по умолчанию)' },
                { value: 'yandex', label: '🟡 Яндекс.Карты (нужен API-ключ в строке ниже)' },
                { value: '2gis',   label: '🟢 2GIS (нужен API-ключ)' },
              ],
            },
            key:        { isVisible: false },
            isEnabled:  { isVisible: false },
            value:      { isVisible: false },
            extraConfig:{ isVisible: false },
            lastFetchedAt: { isVisible: false },
            lastError:  { isVisible: false },
            createdAt:  { isVisible: false },
            updatedAt:  { label: 'Обновлено', isVisible: { list: true, show: true, edit: false, filter: false } },
          },
          actions: {
            list: {
              isAccessible: isAdmin,
              before: async (request: any) => {
                request.query = { ...request.query, filters: { key: 'map_provider' } };
                return request;
              },
            },
            show:   { isAccessible: isAdmin },
            edit:   { isAccessible: isAdmin },
            new:    { isAccessible: () => false },
            delete: { isAccessible: () => false },
            bulkDelete: { isAccessible: () => false },
          },
        },
      },

      // ── Все интеграции (OCPI, API-ключи, сторонние сервисы) ────────────
      {
        resource: { model: getModelByName('Integration'), client: prisma },
        options: {
          id: 'Integrations',
          navigation: { name: '🔌 Интеграции' },
          listProperties: ['name', 'key', 'isEnabled', 'lastFetchedAt', 'lastError'],
          showProperties: ['name', 'key', 'apiKey', 'value', 'isEnabled', 'lastFetchedAt', 'lastError', 'updatedAt'],
          editProperties: ['name', 'key', 'apiKey', 'value', 'isEnabled'],
          filterProperties: ['isEnabled'],
          properties: {
            name: {
              label: 'Название',
              description: 'Понятное название: "OCPI: Electro.cars", "OpenChargeMap API", "Яндекс.Карты"',
            },
            key: {
              label: 'Системный ключ (key)',
              description: 'Уникальный идентификатор. Для OCPI-партнёров: ocpi_partner_XXX. Для API: openchargemap, yandex_maps',
            },
            apiKey: {
              label: 'API-ключ / Токен',
              description: 'Секретный ключ или токен доступа от внешнего сервиса',
            },
            value: {
              label: 'JSON-конфиг (дополнительные настройки)',
              description: [
                'Для OCPI-партнёров — JSON с параметрами подключения:',
                '{"versionsUrl":"https://partner.ru/ocpi/versions","token":"их-токен-к-нам"}',
                '',
                'Для Яндекс.Карты Геопоиск — пусто (apiKey достаточно)',
                'Для 2GIS API — пусто (apiKey достаточно)',
              ].join('\n'),
            },
            isEnabled: {
              label: '✅ Активна',
              description: 'Выключите чтобы временно отключить интеграцию без удаления',
            },
            lastFetchedAt: {
              label: 'Последняя синхронизация',
              isVisible: { list: true, show: true, edit: false, filter: false },
            },
            lastError: {
              label: 'Последняя ошибка',
              description: 'Заполняется автоматически при ошибке синхронизации',
              isVisible: { list: true, show: true, edit: false, filter: false },
            },
            extraConfig: { isVisible: false },
            updatedAt:   { label: 'Обновлено', isVisible: { list: false, show: true, edit: false, filter: false } },
            createdAt:   { label: 'Создано',   isVisible: { list: false, show: true, edit: false, filter: false } },
          },
          actions: {
            // Исключаем map_provider из этого раздела
            list: {
              isAccessible: isAdmin,
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
            // ── Запустить OCPI синхронизацию ──────────────────────────────
            syncOcpi: {
              actionType: 'record',
              label: '🔄 Синхронизировать OCPI',
              icon: 'Refresh',
              isVisible: (ctx: any) => ctx.record?.params?.key?.startsWith('ocpi_partner_'),
              handler: async (_req: any, _res: any, context: any) => {
                const { record, currentAdmin } = context;
                const key: string = record.params.key;
                const partnerId = key.replace('ocpi_partner_', '');
                try {
                  const apiUrl = process.env.API_URL || 'http://localhost:3001';
                  const res = await fetch(`${apiUrl}/api/ocpi/admin/sync/${partnerId}`, {
                    method: 'POST',
                  });
                  const data = await res.json();
                  return {
                    record: record.toJSON(currentAdmin),
                    notice: {
                      message: data.message || `Синхронизировано: ${data.locations} станций`,
                      type: 'success',
                    },
                  };
                } catch (err) {
                  return {
                    record: record.toJSON(currentAdmin),
                    notice: { message: `Ошибка: ${(err as Error).message}`, type: 'error' },
                  };
                }
              },
            },
          },
        },
      },

    ], // end resources
  }); // end new AdminJS

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
