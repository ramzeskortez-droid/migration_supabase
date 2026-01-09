CREATE OR REPLACE FUNCTION auto_archive_chats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Архивация по времени: если ПОСЛЕДНЕЕ сообщение в диалоге старше 7 дней
  WITH thread_stats AS (
      SELECT 
          order_id,
          CASE 
              WHEN sender_role = 'SUPPLIER' THEN sender_name
              ELSE recipient_name 
          END as supplier_identity,
          MAX(created_at) as last_active_at
      FROM chat_messages
      WHERE is_archived = false
      GROUP BY order_id, supplier_identity
  ),
  threads_to_archive AS (
      SELECT order_id, supplier_identity
      FROM thread_stats
      WHERE last_active_at < NOW() - INTERVAL '7 days'
  )
  UPDATE chat_messages cm
  SET is_archived = true
  FROM threads_to_archive tta
  WHERE cm.order_id = tta.order_id
  AND (
      (cm.sender_role = 'SUPPLIER' AND cm.sender_name = tta.supplier_identity)
      OR
      (cm.sender_role = 'ADMIN' AND cm.recipient_name = tta.supplier_identity)
  );

  -- 2. Архивация по статусу
  -- Чат активен ТОЛЬКО если:
  --   Admin Status = 'В обработке'
  --   AND
  --   Supplier Status = 'Сбор предложений' (или 'Сбор офферов')
  -- Во всех остальных случаях (КП готово, Идут торги, Выполнен) чат уходит в архив.
  UPDATE chat_messages cm
  SET is_archived = true
  FROM orders o
  WHERE cm.order_id = o.id
  AND cm.is_archived = false
  AND (
      o.status_admin NOT IN ('В обработке')
      OR
      o.status_supplier NOT IN ('Сбор предложений', 'Сбор офферов')
  );
END;
$$;