-- Обновление политик для чата, чтобы разрешить новые роли
DROP POLICY IF EXISTS "Enable all access for chat" ON chat_messages;

CREATE POLICY "Enable all access for chat"
ON chat_messages
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Если есть ограничения CHECK на колонку sender_role, их нужно удалить (обычно их нет, но проверим)
-- ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_role_check;
