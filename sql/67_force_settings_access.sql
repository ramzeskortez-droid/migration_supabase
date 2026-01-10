-- Сброс всех политик для system_settings
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Enable all for authenticated" ON system_settings;
DROP POLICY IF EXISTS "Enable all for anon" ON system_settings;

-- Полный доступ для авторизованных пользователей (операторы, закупщики, менеджеры)
CREATE POLICY "Enable all for authenticated" ON system_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Разрешаем чтение анонимам (на случай сбоя сессии или SSR)
CREATE POLICY "Enable read for anon" ON system_settings
    FOR SELECT
    TO anon
    USING (true);

-- Разрешаем запись анонимам (ВРЕМЕННО, ДЛЯ ОТЛАДКИ, если клиент теряет токен)
-- Если ошибка сохранится после этого, значит проблема не в RLS, а в чем-то другом (напр. триггеры)
CREATE POLICY "Enable all for anon (debug)" ON system_settings
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
