-- Добавление колонки order_files в таблицу orders для хранения массива файлов
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_files jsonb DEFAULT '[]'::jsonb;

-- Комментарий к колонке
COMMENT ON COLUMN orders.order_files IS 'Список прикрепленных к заказу файлов: [{name, url, size, type}]';
