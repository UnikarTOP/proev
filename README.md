# proev.ru — сервис для владельцев электромобилей в России

Монорепо-скелет проекта:

- `backend/` — NestJS + Prisma + PostgreSQL (PostGIS), REST API
- `frontend/` — Next.js (App Router) + Tailwind + MapLibre GL

## Быстрый старт

Node.js окружение с интернетом (в этой песочнице интернета нет, поэтому `npm install`
нужно запускать у себя локально или на сервере):

```bash
# Backend
cd backend
cp .env.example .env   # заполнить DATABASE_URL и т.д.
npm install
npx prisma migrate dev --name init
npm run start:dev      # http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev             # http://localhost:3000
```

## Структура MVP

1. Карта зарядных станций (`/charge-map`) — с UGC-отзывами о статусе станций
2. Каталог сервисов/партнёров (`/services`) — лидогенерация (СТО, зарядки, страховка)
3. Блог (`/blog`) — SEO-контент

## Админка

`/admin` на бэкенде — панель на AdminJS для модерации станций, партнёров,
лидов и статей блога. Две роли:

- **admin** — полный доступ (включая пользователей, удаление, платное
  размещение партнёров)
- **moderator** — модерация станций/отзывов, работа с лидами; без доступа
  к пользователям и без права удаления

Первого администратора создаёт `deploy.sh` при разворачивании (спросит
email и пароль). Добавить ещё одного модератора или админа позже:

```bash
docker compose exec backend npm run create-admin -- moderator@proev.ru "пароль" moderator
```

**Схема применяется через `prisma db push`** (не через миграции — в проекте
пока нет файлов миграций, `db push` синхронизирует схему с БД напрямую).
Это уже встроено в `Dockerfile`/`deploy.sh` и происходит автоматически при
каждом старте контейнера. Когда схема стабилизируется, стоит перейти на
полноценные миграции (`prisma migrate dev` в дев-окружении, закоммитить
`prisma/migrations/`, дальше `migrate deploy` в проде).

## Развёртывание

Один скрипт разворачивает всё на чистом VPS: Docker, PostgreSQL + PostGIS,
бэкенд и миграции. TLS/домен терминирует внешний reverse-proxy (в т.ч.
Nginx Proxy Manager на отдельной VM в приватной сети — так и было
развёрнуто в проде).

```bash
git clone <твой-репозиторий> proev && cd proev/infra
chmod +x deploy.sh && ./deploy.sh
```

Подробности, включая настройку Proxy Host в NPM — в [`infra/README.md`](./infra/README.md).

## Наполнение карты станциями

Два источника, оба через `backend/prisma/seed.ts`:

1. **OpenChargeMap** (автоматически) — публичный API, тянет все станции с
   `countrycode=RU`. Покрытие России там неполное (сообщество OSM вручную
   дополняет данные Москвы и регионов), но это быстрый старт с реальными
   координатами, операторами и типами разъёмов.
2. **Ручной список** (`backend/prisma/seed-data/manual-stations.json`) —
   станции, которые вы сами нашли и проверили. Скопируйте
   `manual-stations.example.json` → `manual-stations.json` и заполните
   реальными данными. Хорошие источники для проверки:
   - data.mos.ru → набор «Электрозаправки» (открытые данные Москвы)
   - transport.mos.ru/electro/address
   - сайты операторов: Яндекс.Заправки, Россети (по регионам), Sitronics
   - Sitronics/2Chargers и подобные агрегаторы — для сверки, не для копирования без проверки

Запуск:

```bash
cd backend
npm run seed
```

Скрипт идемпотентен — повторный запуск не создаёт дубликаты (upsert по id).

## План следующих шагов

- [x] Поднять PostgreSQL + PostGIS — docker-compose для VPS готов, см. `infra/README.md`
- [x] Скрипт наполнения `charging_stations` (OpenChargeMap API + ручной список) — готов, см. выше
- [ ] Подключить карты (2GIS/Яндекс тайлы) в `frontend/src/components/Map.tsx`
- [ ] Написать 10–15 опорных SEO-статей
- [ ] Найти 5–10 пилотных партнёров для каталога сервисов
