#!/bin/bash
set -e

echo "--- STARTING DEPLOY ---"

# 1. Deploy Frontend
echo "1. Deploying Frontend..."
TARGET_DIR="/var/www/app/dist"
mkdir -p "$TARGET_DIR"
# Удаляем старое содержимое, кроме скрытых файлов (если есть)
find "$TARGET_DIR" -mindepth 1 -delete
# Копируем новое
cp -r ./dist/* "$TARGET_DIR/"
# Права доступа (чтобы Nginx мог читать)
chown -R www-data:www-data "$TARGET_DIR"
chmod -R 755 "$TARGET_DIR"
echo "Frontend deployed to $TARGET_DIR"

echo "--- DEPLOY SUCCESSFUL ---"