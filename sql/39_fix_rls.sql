-- FIX: Если RLS включен, но политик нет - никто ничего не видит.
-- Разрешаем чтение всем (так как фильтрацию делаем на уровне приложения пока что)

CREATE POLICY "Enable read access for all users" ON "public"."orders"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Разрешаем вставку
CREATE POLICY "Enable insert access for all users" ON "public"."orders"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

-- Разрешаем обновление
CREATE POLICY "Enable update access for all users" ON "public"."orders"
AS PERMISSIVE FOR UPDATE
TO public
USING (true);

-- Если политики не работают, можно временно отключить RLS:
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
