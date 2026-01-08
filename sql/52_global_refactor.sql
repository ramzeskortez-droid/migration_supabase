-- 1. REFACTOR OWNERSHIP (Переход на owner_id)
-- Добавляем колонку owner_id
ALTER TABLE orders ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES app_users(id);

-- Миграция данных: заполняем owner_id на основе owner_token
UPDATE orders o
SET owner_id = u.id
FROM app_users u
WHERE o.owner_token = u.token;

-- Удаляем старую колонку (ОСТОРОЖНО: Ломает старый код)
ALTER TABLE orders DROP COLUMN IF EXISTS owner_token;


-- 2. CLEANUP CAR FIELDS (Удаление авто-полей)
ALTER TABLE orders 
    DROP COLUMN IF EXISTS car_brand,
    DROP COLUMN IF EXISTS car_model,
    DROP COLUMN IF EXISTS car_year,
    DROP COLUMN IF EXISTS vin;


-- 3. REFACTOR PRICES (Единая цена admin_price в RUB)

-- A. Таблица OFFER_ITEMS (Офферы)
-- Миграция: Если была рассчитанная цена в рублях (admin_price_rub), переносим её в admin_price
UPDATE offer_items 
SET admin_price = admin_price_rub 
WHERE admin_price_rub IS NOT NULL;

-- Удаление лишних колонок
ALTER TABLE offer_items 
    DROP COLUMN IF EXISTS admin_price_rub,
    DROP COLUMN IF EXISTS admin_currency, -- Всегда RUB
    DROP COLUMN IF EXISTS calculated_price_rub;

-- B. Таблица ORDER_ITEMS (Позиции заказа)
-- Переименование: admin_price_rub -> admin_price
ALTER TABLE order_items 
    RENAME COLUMN admin_price_rub TO admin_price;

-- Добавление колонки admin_price, если переименование не сработало (защита)
-- (В данном случае RENAME достаточно, но если колонки не было, ALTER TABLE ADD...)

-- Удаление лишних
ALTER TABLE order_items 
    DROP COLUMN IF EXISTS calculated_price_rub,
    DROP COLUMN IF EXISTS admin_currency; -- Если была


-- 4. CLEANUP RPC (Обновление функций, если они используют удаленные колонки)
-- Внимание: Если функции используют удаленные колонки, они упадут.
-- Рекомендуется пересоздать функции.
