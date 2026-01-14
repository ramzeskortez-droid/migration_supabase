-- 1. Add UUID columns
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES app_users(id),
ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES app_users(id);

-- 2. Backfill IDs based on names (Best Effort)
-- Sender: Supplier (Закупщик)
UPDATE chat_messages cm
SET sender_id = au.id
FROM app_users au
WHERE cm.sender_role = 'SUPPLIER' 
  AND cm.sender_name = au.name
  AND cm.sender_id IS NULL;

-- Recipient: Supplier (когда Админ/Оператор пишет Закупщику)
UPDATE chat_messages cm
SET recipient_id = au.id
FROM app_users au
WHERE cm.recipient_name = au.name
  AND cm.recipient_id IS NULL;

-- Примечание: Мы пока не заполняем ID для Админа и Оператора жестко, 
-- так как это могут быть системные роли. Сосредоточимся на идентификации Закупщика.
