-- Удаление старых политик для избежания конфликтов
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Enable update for managers only" ON system_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON system_settings;

-- Создание новых, разрешающих политик для авторизованных пользователей
CREATE POLICY "Enable read access for authenticated users" ON system_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON system_settings
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON system_settings
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
