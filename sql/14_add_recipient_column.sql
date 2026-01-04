ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- Обновим существующие записи (попытаемся угадать или оставим NULL)
-- Для новых сообщений это будет обязательно.

NOTIFY pgrst, 'reload schema';
