#!/bin/bash
OLD=$1
[ -z "$OLD" ] && echo "Использование: bash migrate-data.sh OLD_IP" && exit 1

echo "1/4 Дамп БД на старом сервере..."
ssh root@$OLD "cd /home/unikar/proev/infra && docker compose exec -T postgres pg_dump -U proev proev | gzip > /tmp/proev_db.sql.gz"
scp root@$OLD:/tmp/proev_db.sql.gz /tmp/

echo "2/4 Копируем uploads..."
ssh root@$OLD "docker cp infra-backend-1:/app/uploads /tmp/proev_uploads" 2>/dev/null || \
  ssh root@$OLD "tar -czf /tmp/proev_uploads.tar.gz -C /home/unikar/proev uploads"
scp -r root@$OLD:/tmp/proev_uploads* /tmp/ 2>/dev/null || true

echo "3/4 Копируем .env..."
scp root@$OLD:/home/unikar/proev/infra/.env /tmp/proev.env.old
echo "⚠️  Отредактируйте /tmp/proev.env.old - обновите IP и домены перед использованием!"

echo "4/4 Готово! Следующий шаг: bash restore-db.sh"
