#!/bin/bash
cd /opt/proev/infra
docker compose up -d postgres
sleep 10
echo "Восстанавливаем БД..."
gunzip -c /tmp/proev_db.sql.gz | docker compose exec -T postgres psql -U proev proev
echo "БД восстановлена!"
