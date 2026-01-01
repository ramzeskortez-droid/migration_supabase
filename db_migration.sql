-- Добавление недостающих колонок в таблицу offer_items

-- 1. Вес и Фото (для Поставщика)
ALTER TABLE public.offer_items 
ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 0;

ALTER TABLE public.offer_items 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Комментарий админа и Тариф доставки (для Админа)
ALTER TABLE public.offer_items 
ADD COLUMN IF NOT EXISTS admin_comment TEXT;

ALTER TABLE public.offer_items 
ADD COLUMN IF NOT EXISTS delivery_rate NUMERIC DEFAULT 0;
