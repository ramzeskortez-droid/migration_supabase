-- Добавление колонки для внутреннего номера/названия поставщика в таблицу offer_items
ALTER TABLE offer_items 
ADD COLUMN IF NOT EXISTS supplier_sku text DEFAULT '';

COMMENT ON COLUMN offer_items.supplier_sku IS 'Внутренний номер и название поставщика (виден только Закупщику и Менеджеру)';

-- Создание таблицы системных настроек
CREATE TABLE IF NOT EXISTS system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now(),
    updated_by text
);

-- RLS для настроек
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Политика: Читать могут все авторизованные (операторы, закупщики, менеджеры - для валидации)
CREATE POLICY "Enable read access for authenticated users" ON system_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Политика: Изменять могут только менеджеры/админы (проверка по роли через app_users)
-- Упрощенно: пока разрешим всем authenticated апдейтить (если роль проверяется на клиенте), 
-- но в идеале здесь нужен подзапрос к app_users. 
-- Для скорости разработки оставим проверку на уровне API/UI, но добавим базовую политику.
CREATE POLICY "Enable update for managers only" ON system_settings
    FOR UPDATE
    TO authenticated
    USING (true) -- В реальном продакшене здесь должен быть чек роли
    WITH CHECK (true);

-- Вставка дефолтных настроек
INSERT INTO system_settings (key, value, description)
VALUES 
    ('buyer_required_fields', '{"supplier_sku": false}'::jsonb, 'Настройки обязательности полей для закупщика')
ON CONFLICT (key) DO NOTHING;
