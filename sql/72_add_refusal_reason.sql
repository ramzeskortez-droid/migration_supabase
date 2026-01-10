-- Добавление колонки причины отказа
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refusal_reason text;

COMMENT ON COLUMN orders.refusal_reason IS 'Причина аннулирования или отказа по заказу';
