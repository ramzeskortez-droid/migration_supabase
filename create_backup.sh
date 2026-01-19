#!/bin/bash
set -e

# Настройки
BACKUP_ROOT="/root/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
TARGET_DIR="$BACKUP_ROOT/$TIMESTAMP"
ARCHIVE_NAME="backup_full_$TIMESTAMP.tar.gz"

# Пароль БД (из наших прошлых скриптов)
DB_PASS="Supabase2026!DB"

mkdir -p "$TARGET_DIR"
echo "--- 🚀 STARTING BACKUP [$TIMESTAMP] ---"

# 1. Бэкап Базы Данных
echo "📦 Dumping Database..."
# Ищем контейнер с именем supabase-db
DB_CONTAINER=$(docker ps --filter "name=supabase-db" --format "{{.ID}}")

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ Error: DB Container not found!"
    exit 1
fi

# Делаем дамп
docker exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" pg_dumpall -U postgres --clean --if-exists --file=/tmp/db_dump.sql
docker cp "$DB_CONTAINER":/tmp/db_dump.sql "$TARGET_DIR/db_dump.sql"
docker exec "$DB_CONTAINER" rm /tmp/db_dump.sql

echo "✅ Database dumped."

# 2. Бэкап Файлов (Скрипты + Конфиги)
echo "📂 Archiving Files..."

# Создаем структуру
mkdir -p "$TARGET_DIR/scripts"

# Копируем важные папки (игнорируя node_modules для экономии места, их можно переустановить)
rsync -av --exclude='node_modules' /root/mail-sync "$TARGET_DIR/scripts/"
rsync -av --exclude='node_modules' /root/ai-worker "$TARGET_DIR/scripts/"
cp /root/supabase-docker/docker/.env "$TARGET_DIR/supabase.env" 2>/dev/null || true

echo "✅ Files copied."

# 3. Архивация
echo "🗜️ Compressing..."
cd "$BACKUP_ROOT"
tar -czf "$ARCHIVE_NAME" "$TIMESTAMP"
rm -rf "$TIMESTAMP" # Удаляем временную папку

# 4. Очистка старых бэкапов (храним 7 дней)
find "$BACKUP_ROOT" -name "backup_full_*.tar.gz" -mtime +7 -delete

echo "--- 🎉 BACKUP SUCCESSFUL ---"
echo "📍 Location: $BACKUP_ROOT/$ARCHIVE_NAME"
echo "👉 Size: $(du -h $ARCHIVE_NAME | cut -f1)"
