#!/bin/bash
set -e

BACKUP_DIR="/opt/backups/proev_$(date +%Y%m%d_%H%M%S)"
KEEP_DAYS=7
LOG="/var/log/proev-backup.log"

echo "[$(date)] Начинаем бекап..." >> $LOG

mkdir -p "$BACKUP_DIR"

# Код проекта
cp -r /opt/proev "$BACKUP_DIR/proev" >> $LOG 2>&1

# База данных
cd /opt/proev/infra
docker compose exec -T postgres pg_dump -U proev proev > "$BACKUP_DIR/database.sql"

# Загруженные файлы
docker compose cp backend:/app/uploads "$BACKUP_DIR/uploads" 2>/dev/null || true

# Архивируем
tar -czf "${BACKUP_DIR}.tar.gz" -C /opt/backups "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

# Удаляем старые бекапы
find /opt/backups -name "proev_*.tar.gz" -mtime +$KEEP_DAYS -delete

SIZE=$(du -sh "${BACKUP_DIR}.tar.gz" | cut -f1)
echo "[$(date)] Бекап готов: ${BACKUP_DIR}.tar.gz ($SIZE)" >> $LOG

