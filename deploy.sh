#!/bin/bash
set -e
echo "=== Деплой proev.ru ==="
cd /opt/proev/infra
docker compose build --no-cache
docker compose up -d
sleep 15
docker compose exec -T backend npm run seed 2>/dev/null || true
echo "=== Готово ==="
docker compose ps
