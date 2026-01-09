-- Обновление финансовой модели
-- 1. Добавляем поле для добавки к сроку поставки (в неделях)
ALTER TABLE exchange_rates 
ADD COLUMN IF NOT EXISTS delivery_weeks_add NUMERIC DEFAULT 0;

-- 2. usd_rub больше не используется в расчетах, но оставим колонку для истории.
-- Новая формула: (Price * CNY_RUB) + (Weight * DeliveryUSD * CNY_USD * CNY_RUB) + Markup
