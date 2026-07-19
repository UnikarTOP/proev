#!/usr/bin/env bash
#
# Разворачивает proev.ru на чистом VPS (Ubuntu 22.04+) одной командой:
# ставит Docker, настраивает firewall, поднимает Postgres+PostGIS, бэкенд,
# Caddy (HTTPS), прогоняет миграции и seed.
#
# Запуск (из папки infra/ уже склонированного репозитория):
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Скрипт идемпотентен — можно перезапускать при обновлениях, ничего не сломает.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log()  { echo -e "\n\033[1;32m==> $1\033[0m"; }
warn() { echo -e "\033[1;33m[!] $1\033[0m"; }
die()  { echo -e "\033[1;31m[x] $1\033[0m"; exit 1; }

# ---------- 0. Проверки ----------
if [[ "$EUID" -eq 0 ]]; then
  warn "Скрипт запущен от root — это ок, но для docker обычно лучше отдельный sudo-пользователь."
fi

[[ -f "../backend/Dockerfile" ]] || die "Не найден ../backend/Dockerfile — запускай скрипт из папки infra/ склонированного репозитория."

# ---------- 1. Docker ----------
if ! command -v docker &>/dev/null; then
  log "Docker не найден — устанавливаю (get.docker.com)"
  curl -fsSL https://get.docker.com | sh
  if [[ "$EUID" -ne 0 ]]; then
    sudo usermod -aG docker "$USER"
    warn "Добавил $USER в группу docker. Если команда docker ниже упадёт с правами — перелогинься (exit, снова ssh) и запусти скрипт ещё раз."
  fi
else
  log "Docker уже установлен — пропускаю"
fi

DOCKER="docker"
if ! docker ps &>/dev/null; then
  DOCKER="sudo docker"
  warn "Запускаю docker через sudo (текущий пользователь ещё не в группе docker в этой сессии)"
fi

$DOCKER compose version &>/dev/null || die "docker compose plugin не найден. Переустанови Docker: curl -fsSL https://get.docker.com | sh"

# ---------- 2. Firewall ----------
if command -v ufw &>/dev/null; then
  log "Настраиваю firewall (открываю только SSH, 80, 443)"
  sudo ufw allow OpenSSH >/dev/null
  sudo ufw allow 80/tcp  >/dev/null
  sudo ufw allow 443/tcp >/dev/null
  sudo ufw --force enable >/dev/null
  echo "Firewall: $(sudo ufw status | head -1)"
else
  warn "ufw не найден — пропускаю настройку firewall. Убедись, что 5432 и 3001 не торчат наружу вручную."
fi

# ---------- 3. .env ----------
if [[ ! -f .env ]]; then
  log "Создаю .env"
  RANDOM_PASSWORD="$(openssl rand -base64 24 | tr -d '=+/')"
  cat > .env << EOF
POSTGRES_DB=proev
POSTGRES_USER=proev
POSTGRES_PASSWORD=${RANDOM_PASSWORD}
EOF
  echo "Сгенерирован пароль БД и сохранён в .env (никуда больше не публикуй этот файл)."
else
  log ".env уже существует — использую его"
fi

# ---------- 4. Домен для Caddy ----------
CURRENT_DOMAIN="$(grep -m1 -oE '^[a-zA-Z0-9.-]+' Caddyfile || true)"
if [[ -z "${DOMAIN:-}" ]]; then
  read -rp $'\nВведи домен для API (например api.proev.ru), либо Enter чтобы оставить "'"${CURRENT_DOMAIN}"$'": ' INPUT_DOMAIN
  DOMAIN="${INPUT_DOMAIN:-$CURRENT_DOMAIN}"
fi

if [[ "$DOMAIN" != "$CURRENT_DOMAIN" ]]; then
  log "Прописываю домен в Caddyfile: $DOMAIN"
  sed -i "s/^${CURRENT_DOMAIN} {/${DOMAIN} {/" Caddyfile
fi

warn "Убедись, что A-запись ${DOMAIN} → IP этого сервера уже создана и успела распространиться (иначе Caddy не сможет выпустить HTTPS-сертификат)."
read -rp "Продолжить деплой? [Y/n] " CONFIRM
[[ "${CONFIRM:-Y}" =~ ^[Yy]?$ ]] || die "Остановлено пользователем."

# ---------- 5. Собрать и запустить ----------
log "Собираю и запускаю контейнеры (это может занять пару минут)"
$DOCKER compose up -d --build

log "Жду, пока backend станет healthy"
ATTEMPTS=0
until $DOCKER compose ps backend | grep -q "Up" || [[ $ATTEMPTS -ge 30 ]]; do
  sleep 2
  ATTEMPTS=$((ATTEMPTS+1))
done
$DOCKER compose ps

# ---------- 6. Seed данных ----------
log "Наполняю карту станциями (OpenChargeMap + ручной список, если есть)"
$DOCKER compose exec -T backend npm run seed || warn "Seed завершился с ошибкой — глянь логи: docker compose logs backend"

# ---------- 7. Проверка ----------
log "Проверяю API"
sleep 3
if curl -fsS "https://${DOMAIN}/api/stations" -o /tmp/proev_check.json 2>/dev/null; then
  echo "OK — API отвечает: https://${DOMAIN}/api/stations"
  echo "Станций в ответе: $(grep -o '"id"' /tmp/proev_check.json | wc -l)"
else
  warn "HTTPS ещё не готов или API не отвечает. Это нормально в первые 1-2 минуты (Caddy выпускает сертификат)."
  echo "Проверь вручную чуть позже: curl https://${DOMAIN}/api/stations"
  echo "И логи: docker compose logs -f caddy backend"
fi

log "Готово. Полезные команды:"
echo "  docker compose logs -f backend     — логи бэкенда"
echo "  docker compose exec backend npm run seed   — повторно наполнить карту"
echo "  docker compose down                — остановить всё"
echo "  git pull && docker compose up -d --build   — обновить и передеплоить"
