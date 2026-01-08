-- Добавление колонки client_email в таблицу orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_email TEXT;
