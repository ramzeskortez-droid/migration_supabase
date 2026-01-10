-- Исправление RLS для invite_codes
DROP POLICY IF EXISTS "Admins can manage invites" ON invite_codes;

-- Разрешаем авторизованным пользователям (менеджерам) создавать и читать инвайты
CREATE POLICY "Authenticated can insert invites" ON invite_codes
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated can select invites" ON invite_codes
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated can update invites" ON invite_codes
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- На всякий случай дадим доступ anon (для отладки, если токен теряется), но только на чтение своей записи (через RPC безопаснее)
-- Но генерация должна работать.

-- Убедимся, что RLS включен
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
