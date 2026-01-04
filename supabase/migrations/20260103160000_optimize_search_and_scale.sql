-- 1. Включаем расширение для быстрого поиска по подстрокам (ILIKE '%...%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Индексы для таблицы ORDERS (Admin & Seller Search)
-- GIN индексы позволяют искать по части строки в 100 раз быстрее обычных
CREATE INDEX IF NOT EXISTS idx_orders_vin_trgm ON public.orders USING gin (vin gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_client_name_trgm ON public.orders USING gin (client_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_client_phone_trgm ON public.orders USING gin (client_phone gin_trgm_ops);

-- B-Tree индексы для точных совпадений и сортировок (стандартные)
CREATE INDEX IF NOT EXISTS idx_orders_status_admin ON public.orders(status_admin);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_id ON public.orders(id);

-- 3. Индексы для таблицы OFFERS
CREATE INDEX IF NOT EXISTS idx_offers_order_id ON public.offers(order_id);
CREATE INDEX IF NOT EXISTS idx_offers_supplier_name ON public.offers(supplier_name);

-- 4. Индексы для CHAT_MESSAGES (чтобы чат на 1 млн сообщений летал)
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON public.chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- 5. Анализируем таблицу, чтобы Postgres обновил статистику для планировщика
ANALYZE public.orders;
ANALYZE public.chat_messages;
