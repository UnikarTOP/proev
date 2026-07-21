# Развёртывание на VPS

Эта инструкция описывает вариант, когда перед сервером стоит **Nginx Proxy
Manager (NPM) на отдельной VM** в той же приватной сети — он и терминирует
TLS/домен, а этот сервер отдаёт только API на приватном интерфейсе.

Если у тебя нет отдельного NPM и нужен свой reverse-proxy с автоматическим
HTTPS прямо на этом сервере — скажи, вернём Caddy в стек (это была
предыдущая версия конфига, простая в разворачивании для одиночного VPS).

## Быстрый путь — один скрипт

```bash
git clone <твой-репозиторий> proev
cd proev/infra
chmod +x deploy.sh
./deploy.sh
```

Скрипт сам:
1. Ставит Docker, если его нет
2. Настраивает firewall
3. Генерирует пароль БД, секреты сессии админки и определяет приватный IP
   сервера (спросит подтверждение/поправку)
4. Поднимает Postgres+PostGIS и бэкенд, публикует API **только на приватном
   интерфейсе** (`PRIVATE_BIND_IP:3001` — снаружи недоступно)
5. Прогоняет seed — наполняет карту станциями
6. Спросит, создать ли первого администратора

## Настройка в NPM (отдельная VM)

Зайди в веб-интерфейс NPM (`http://IP-VM-с-NPM:81/`) и добавь **два** Proxy Host:

**API (бэкенд):**
- **Domain Names:** `api.proev.ru`
- **Forward Hostname/IP:** приватный IP этого сервера (`PRIVATE_BIND_IP` в `.env`, например `192.168.38.200`)
- **Forward Port:** `3001`
- SSL → Request a new SSL Certificate → Force SSL

**Сайт (фронтенд):**
- **Domain Names:** `proev.ru` (и `www.proev.ru`, если нужно)
- **Forward Hostname/IP:** тот же приватный IP
- **Forward Port:** `3000`
- SSL → Request a new SSL Certificate → Force SSL

NPM сам выпустит и обновит сертификаты Let's Encrypt для обоих доменов.

**Важно:** для этого нужна связность на уровне приватной сети между VM с
NPM и этим сервером (обычно так и есть, если обе машины в одном приватном
сегменте/VPC у одного провайдера). Если NPM не может достучаться —
проверь, что обе VM видят друг друга: `ping <приватный-IP-другой-VM>`.

## Полезные команды

```bash
docker compose logs -f backend           # логи бэкенда
docker compose exec backend npm run seed # повторно наполнить карту
docker compose exec backend npm run create-admin -- email пароль admin
docker compose down                      # остановить всё
git pull && ./deploy.sh                  # обновить и передеплоить
curl http://ПРИВАТНЫЙ_IP:3001/api/stations   # проверка изнутри сети, минуя NPM
```
