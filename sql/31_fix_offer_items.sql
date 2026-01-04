-- Исправление схемы: добавляем поля для цены и в таблицу предложений (offer_items)
ALTER TABLE offer_items 
ADD COLUMN IF NOT EXISTS admin_price_rub NUMERIC,
ADD COLUMN IF NOT EXISTS is_manual_price BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS calculated_price_rub NUMERIC,
ADD COLUMN IF NOT EXISTS admin_currency TEXT, -- на случай если не было
ADD COLUMN IF NOT EXISTS admin_price NUMERIC, -- на случай если не было
ADD COLUMN IF NOT EXISTS admin_comment TEXT,
ADD COLUMN IF NOT EXISTS delivery_rate NUMERIC;

-- Очистка некорректных данных стикеров, если есть дубли
-- (необязательно, но полезно перед фиксом кода)
