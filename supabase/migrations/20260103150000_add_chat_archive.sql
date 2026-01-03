-- Добавляем флаг архива
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Индекс для фильтрации по архиву
CREATE INDEX IF NOT EXISTS idx_chat_archived ON public.chat_messages(is_archived);

-- Функция для авто-архивации (сообщения старше 3 дней, где нет активности)
-- Логика: Если последнее сообщение в ветке (Order + Supplier) было более 3 дней назад -> пометить всю ветку как архивную.
CREATE OR REPLACE FUNCTION public.archive_old_chats()
RETURNS void AS $$
BEGIN
    -- Находим группы (order_id, supplier_name), где последнее сообщение старше 3 дней
    WITH stale_chats AS (
        SELECT order_id, sender_name, recipient_name
        FROM public.chat_messages
        GROUP BY order_id, sender_name, recipient_name
        HAVING MAX(created_at) < (now() - interval '3 days')
    )
    UPDATE public.chat_messages cm
    SET is_archived = TRUE
    FROM stale_chats sc
    WHERE cm.order_id = sc.order_id 
      AND (
          (cm.sender_name = sc.sender_name AND cm.recipient_name = sc.recipient_name)
          OR 
          (cm.sender_name = sc.recipient_name AND cm.recipient_name = sc.sender_name)
      )
      AND cm.is_archived = FALSE;
END;
$$ LANGUAGE plpgsql;
