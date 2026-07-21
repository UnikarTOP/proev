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
  ADMIN_COOKIE_SECRET_VAL="$(openssl rand -base64 32 | tr -d '=+/')"
  ADMIN_SESSION_SECRET_VAL="$(openssl rand -base64 32 | tr -d '=+/')"
  DETECTED_PRIVATE_IP="$(ip -4 addr show | awk '/inet /{print $2}' | cut -d/ -f1 | grep -E '^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)' | head -1)"
  read -rp $'\nПриватный IP этого сервера (Enter чтобы использовать определённый автоматически "'"${DETECTED_PRIVATE_IP:-не найден}"$'"): ' INPUT_PRIVATE_IP
  INPUT_PRIVATE_IP="${INPUT_PRIVATE_IP%$'\r'}"
  PRIVATE_IP="${INPUT_PRIVATE_IP:-$DETECTED_PRIVATE_IP}"
  read -rp $'\nПубличный URL API для фронтенда (например https://api.proev.ru/api): ' INPUT_API_URL
  INPUT_API_URL="${INPUT_API_URL%$'\r'}"
  cat > .env << EOF
POSTGRES_DB=proev
POSTGRES_USER=proev
POSTGRES_PASSWORD=${RANDOM_PASSWORD}
ADMIN_COOKIE_SECRET=${ADMIN_COOKIE_SECRET_VAL}
ADMIN_SESSION_SECRET=${ADMIN_SESSION_SECRET_VAL}
PRIVATE_BIND_IP=${PRIVATE_IP}
NEXT_PUBLIC_API_URL=${INPUT_API_URL}
EOF
  echo "Сгенерированы пароль БД и секреты сессии админки, приватный IP: ${PRIVATE_IP:-<не определён, впиши вручную в .env>}. Сохранено в .env (никуда больше не публикуй этот файл)."
else
  log ".env уже существует — использую его"
fi

# ---------- 4. Домен и TLS ----------
warn "TLS и домен теперь настраиваются НЕ здесь, а в веб-интерфейсе Nginx Proxy Manager (или другого reverse-proxy перед этим сервером)."
warn "Добавь в NPM Proxy Host: домен -> приватный IP этого сервера (см. PRIVATE_BIND_IP в .env), порт 3001, включи SSL."
read -rp "Продолжить деплой? [Y/n] " CONFIRM
CONFIRM="${CONFIRM%$'\r'}"
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

# ---------- 6.5 Первый администратор ----------
if ! $DOCKER compose exec -T postgres psql -U "${POSTGRES_USER:-proev}" -d "${POSTGRES_DB:-proev}" -tAc \
    "SELECT 1 FROM \"User\" WHERE role = 'admin' LIMIT 1;" 2>/dev/null | grep -q 1; then
  echo
  read -rp "Администратора ещё нет. Создать сейчас? [Y/n] " CREATE_ADMIN
  CREATE_ADMIN="${CREATE_ADMIN%$'\r'}"   # на случай \r от некоторых SSH-клиентов на Windows
  if [[ "${CREATE_ADMIN:-Y}" =~ ^[Yy]?$ ]]; then
    read -rp "Email администратора: " ADMIN_EMAIL
    ADMIN_EMAIL="${ADMIN_EMAIL%$'\r'}"
    read -rsp "Пароль (минимум 8 символов): " ADMIN_PASSWORD
    echo
    ADMIN_PASSWORD="${ADMIN_PASSWORD%$'\r'}"
    $DOCKER compose exec -T backend npm run create-admin -- "$ADMIN_EMAIL" "$ADMIN_PASSWORD" admin
  else
    warn "Пропущено. Создать позже: docker compose exec backend npm run create-admin -- email пароль admin"
  fi
else
  log "Администратор уже есть — пропускаю создание"
fi

# ---------- 7. Проверка ----------
BIND_IP="${PRIVATE_BIND_IP:-192.168.38.200}"
log "Бэкенд поднят на приватном интерфейсе ${BIND_IP}:3001"
echo "Проверить локально: curl http://${BIND_IP}:3001/api/stations"
echo "Проверить снаружи — после настройки Proxy Host в NPM: curl https://твой-домен/api/stations"

log "Готово. Полезные команды:"
echo "  docker compose logs -f backend     — логи бэкенда"
echo "  docker compose exec backend npm run seed   — повторно наполнить карту"
echo "  docker compose down                — остановить всё"
echo "  git pull && docker compose up -d --build   — обновить и передеплоить"
