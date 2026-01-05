-- Добавляем артикул и ед.изм в order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS article TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS uom TEXT DEFAULT 'шт';
