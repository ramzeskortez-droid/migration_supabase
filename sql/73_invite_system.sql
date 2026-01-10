-- Таблица инвайт-кодов
CREATE TABLE IF NOT EXISTS invite_codes (
    code text PRIMARY KEY,
    role text NOT NULL CHECK (role IN ('operator', 'buyer', 'admin')),
    is_used boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    used_at timestamptz,
    used_by_user_id uuid
);

-- RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Менеджеры могут всё (чтение, создание)
CREATE POLICY "Admins can manage invites" ON invite_codes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Для регистрации (публичный доступ на чтение/апдейт одной записи по коду?)
-- Проблема: Анонимный пользователь не может читать таблицу инвайтов напрямую безопасно (чтобы не сбрутить).
-- Лучше делать проверку через RPC функцию с `security definer`.

-- Функция для безопасного использования инвайта
CREATE OR REPLACE FUNCTION use_invite_code(p_code text, p_role text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Запускается от имени создателя функции (админа БД)
AS $$
DECLARE
    v_code_record invite_codes%ROWTYPE;
BEGIN
    -- Ищем код
    SELECT * INTO v_code_record
    FROM invite_codes
    WHERE code = p_code AND role = p_role AND is_used = false
    FOR UPDATE; -- Блокируем строку

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Помечаем как использованный
    UPDATE invite_codes
    SET is_used = true,
        used_at = now(),
        used_by_user_id = p_user_id
    WHERE code = p_code;

    RETURN true;
END;
$$;
