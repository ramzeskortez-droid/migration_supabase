-- Добавляем колонку для связи заказа с email сообщением
ALTER TABLE orders ADD COLUMN email_message_id uuid REFERENCES incoming_emails(id);

-- Индекс для быстрого поиска
CREATE INDEX idx_orders_email_message_id ON orders(email_message_id);

COMMENT ON COLUMN orders.email_message_id IS 'ID письма из таблицы incoming_emails, на основе которого создан заказ';