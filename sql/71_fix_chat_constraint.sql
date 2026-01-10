-- Удаление ограничения на роли отправителя в чате
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_role_check;

-- Добавление нового ограничения (опционально, если хотите строгую валидацию)
-- ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_role_check 
-- CHECK (sender_role IN ('ADMIN', 'SUPPLIER', 'MANAGER', 'OPERATOR'));
