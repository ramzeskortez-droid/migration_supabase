-- Добавляем поле deadline (Срок до) в таблицу заказов
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deadline DATE;