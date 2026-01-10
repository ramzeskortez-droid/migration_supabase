-- Добавляем колонку item_files в таблицу order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS item_files jsonb DEFAULT '[]'::jsonb;

-- На всякий случай проверяем offer_items (обычно там есть, но для гарантии)
ALTER TABLE offer_items 
ADD COLUMN IF NOT EXISTS item_files jsonb DEFAULT '[]'::jsonb;
