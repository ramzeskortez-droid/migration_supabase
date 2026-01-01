-- 1. Добавляем колонку времени изменения статуса
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Для существующих записей заполняем временем создания (чтобы сортировка не ломалась)
UPDATE public.orders 
SET status_updated_at = created_at 
WHERE status_updated_at IS NULL;