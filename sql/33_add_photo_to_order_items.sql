-- Добавляем поле для фото в таблицу позиций заказа (для Оператора)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- (Опционально) Если бакет еще не создан, это делается через UI Supabase, 
-- но мы можем создать policy для storage.objects, если бакет уже есть.
-- Пока оставим это на ручную настройку в Dashboard: Storage -> New Bucket "attachments" -> Public.
