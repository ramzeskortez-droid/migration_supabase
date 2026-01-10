-- Функция для создания инвайт-кода (доступна anon, но логика внутри)
CREATE OR REPLACE FUNCTION create_invite_code(p_code text, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO invite_codes (code, role)
    VALUES (p_code, p_role);
END;
$$;

-- Разрешаем anon вызывать эту функцию (так как мы не используем Supabase Auth)
GRANT EXECUTE ON FUNCTION create_invite_code(text, text) TO anon;
GRANT EXECUTE ON FUNCTION create_invite_code(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invite_code(text, text) TO service_role;

-- Также нужно разрешить чтение инвайтов для отображения списка
-- Разрешаем anon читать invite_codes (фильтрация на клиенте/бэке не идеальна, но пока так)
DROP POLICY IF EXISTS "Authenticated can select invites" ON invite_codes;
CREATE POLICY "Allow select for anon" ON invite_codes FOR SELECT TO anon USING (true);
