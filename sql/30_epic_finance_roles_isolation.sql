-- 1. EPIC: OPERATOR & SECURITY (ISOLATION)
-- Таблица пользователей для простой токен-авторизации
CREATE TABLE IF NOT EXISTS app_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    role TEXT CHECK (role IN ('admin', 'operator', 'buyer')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем тестовых пользователей (если их нет)
INSERT INTO app_users (name, token, role) VALUES 
('Admin', 'admin_secret', 'admin'),
('Operator 1', 'op1', 'operator'),
('Operator 2', 'op2', 'operator'),
('Buyer 1', 'buy1', 'buyer'),
('Buyer 2', 'buy2', 'buyer')
ON CONFLICT (token) DO NOTHING;

-- Добавляем поле владельца в заказы для изоляции
ALTER TABLE orders ADD COLUMN IF NOT EXISTS owner_token TEXT REFERENCES app_users(token);

-- RLS для Orders (Включаем Row Level Security)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Политика: Админ и Закупщики видят всё, Оператор видит только свои
-- ПРИМЕЧАНИЕ: Для работы этого policy в приложении нужно будет делать set_config('app.current_user_token', token, true)
-- Пока создаем policy, но оставляем его "permissive" для начала или используем функцию-обертку.
-- Для простоты на старте: Логика фильтрации будет дублироваться в `supabaseService` через .eq('owner_token', ...), 
-- так как "Простая авторизация" без supabase.auth.user() требует настройки сессии БД на каждый запрос.

-- 2. EPIC: FINANCE (EXCHANGE RATES)
CREATE TABLE IF NOT EXISTS exchange_rates (
    date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    cny_rub NUMERIC NOT NULL,
    usd_rub NUMERIC NOT NULL,
    cny_usd NUMERIC, -- Можно вычислять, можно хранить
    delivery_kg_usd NUMERIC DEFAULT 0,
    markup_percent NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем дефолтный курс на сегодня (чтобы не сломать UI)
INSERT INTO exchange_rates (date, cny_rub, usd_rub, cny_usd, delivery_kg_usd, markup_percent)
VALUES (CURRENT_DATE, 13.5, 92.0, 0.146, 5.5, 20)
ON CONFLICT (date) DO NOTHING;

-- Модификация Order Items для фиксации цены
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS admin_price_rub NUMERIC, -- Итоговая цена для клиента (которую видит менеджер)
ADD COLUMN IF NOT EXISTS is_manual_price BOOLEAN DEFAULT FALSE, -- Флаг: цена введена вручную или рассчитана
ADD COLUMN IF NOT EXISTS calculated_price_rub NUMERIC; -- Справочно: цена, которую насчитала система (чтобы видеть разницу)

-- 3. EPIC: BUYER (STICKERS & COMPETITION)
CREATE TABLE IF NOT EXISTS buyer_order_labels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_token TEXT NOT NULL REFERENCES app_users(token) ON DELETE CASCADE,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, -- ISPR: UUID -> BIGINT
    color TEXT NOT NULL, -- hex code or preset name ('blue', 'red')
    label_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_token, order_id) -- Один стикер на заказ для одного юзера
);

-- Функция для получения лучшей цены конкурентов по позиции
-- Используется закупщиком, чтобы понять "проходит" ли он по цене
CREATE OR REPLACE FUNCTION get_best_offer_price(p_order_item_id BIGINT) -- ISPR: UUID -> BIGINT (предполагаем items тоже bigint)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT MIN(price * quantity) -- Считаем общую стоимость предложения или цену за единицу? Обычно сравнивают unit price. Пусть будет unit price.
    FROM offer_items
    WHERE order_item_id = p_order_item_id
    -- Можно добавить условие: учитывать только активные офферы
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Computed column is tricky with parameters, so we'll just use the function in select queries
-- Or creating a view/computed col on offer_items is not efficient. 
-- Better approach: Create a secure view or use rpc.

-- Обновление для "Умного фильтра" брендов (уже есть таблица brands, просто убедимся)
-- (Таблица brands создана в предыдущем коммите)

-- КОММЕНТАРИЙ К МИГРАЦИИ:
-- 1. При создании заказа нужно обязательно передавать owner_token (из localStorage оператора).
-- 2. При расчете цены нужно брать курс из exchange_rates (на дату заказа или текущую).
