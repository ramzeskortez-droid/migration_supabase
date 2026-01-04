-- Добавляем колонку brand в order_items для нормальной фильтрации
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS brand TEXT;

-- (Опционально) Попытаться извлечь бренд из комментариев для старых записей
-- UPDATE order_items SET brand = substring(comment from 'Бренд: (.*?),'); 
-- Но это сложно и ненадежно через SQL, оставим старые как есть или пустыми.
