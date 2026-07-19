# Развёртывание на VPS

Подходит для любого провайдера — Timeweb, Reg.ru, Selectel, Hetzner, DigitalOcean и т.д.
Минимальные требования: Ubuntu 22.04+, 2 ГБ RAM, публичный IP.

## Быстрый путь — один скрипт

```bash
# на VPS, от пользователя с sudo-правами
git clone <твой-репозиторий> proev
cd proev/infra
chmod +x deploy.sh
./deploy.sh
```

Скрипт `deploy.sh` сам:
1. Ставит Docker, если его нет
2. Настраивает firewall (открыт только SSH, 80, 443 — БД и бэкенд наружу не торчат)
3. Генерирует пароль для БД и создаёт `.env`, если его ещё нет
4. Спросит домен для API (например `api.proev.ru`) и впишет его в `Caddyfile`
5. Собирает и запускает Postgres+PostGIS, бэкенд, Caddy (HTTPS через Let's Encrypt)
6. Прогоняет seed — наполняет карту станциями из OpenChargeMap
7. Проверяет, что API отвечает по HTTPS

Скрипт идемпотентен — можно перезапускать (например после `git pull`) без побочных эффектов.

**Перед запуском:** добавь A-запись `api.proev.ru → IP сервера` у регистратора домена — без этого Caddy не сможет выпустить сертификат.

## Что нужно подготовить заранее

- VPS с Ubuntu 22.04+ (у любого провайдера)
- Домен, у которого можно добавить A-запись (например поддомен `api.` от `proev.ru`)
- SSH-доступ к серверу

## После деплоя — подключить фронтенд

В `frontend/.env.local` (или в переменных окружения хостинга фронтенда):

```
NEXT_PUBLIC_API_URL=https://api.proev.ru/api
```

## Ручные шаги (если скрипт не подошёл — например, другой дистрибутив)

<details>
<summary>Развернуть по шагам вручную</summary>

### 1. Установить Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# перелогиньтесь (exit и снова ssh)
```

### 2. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. Настроить окружение

```bash
cd proev/infra
cp .env.example .env
nano .env   # вписать POSTGRES_PASSWORD (сгенерировать: openssl rand -base64 24)
nano Caddyfile   # поправить домен на свой
```

### 4. Запустить

```bash
docker compose up -d --build
docker compose logs -f backend   # убедиться, что миграции прошли без ошибок
```

### 5. Наполнить карту

```bash
docker compose exec backend npm run seed
```

### 6. Проверить

```bash
curl https://api.proev.ru/api/stations
```

</details>

## Дальше

- **Бэкапы БД**: `docker compose exec postgres pg_dump -U proev proev > backup.sql` (лучше по крону)
- **Обновление кода**: `git pull && ./deploy.sh` (или `docker compose up -d --build`)
- **Мониторинг**: для старта достаточно `docker compose logs -f`
