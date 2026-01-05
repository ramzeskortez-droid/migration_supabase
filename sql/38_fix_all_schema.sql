-- FIX ALL SCHEMA
-- Выполните этот скрипт, чтобы добавить все новые колонки

ALTER TABLE orders ADD COLUMN IF NOT EXISTS deadline DATE;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS article TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS uom TEXT DEFAULT 'шт';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE offer_items ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT;