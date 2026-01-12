CREATE OR REPLACE FUNCTION auto_archive_chats() RETURNS void AS $$
BEGIN
  -- 1. Архивация: Если заказ в архивном статусе, помечаем сообщения как архивные
  UPDATE chat_messages
  SET is_archived = true
  FROM orders
  WHERE chat_messages.order_id = orders.id
  AND orders.status_manager IN ('Архив', 'Аннулирован', 'Отказ', 'Выполнен', 'КП отправлено', 'Обработано вручную')
  AND chat_messages.is_archived = false;

  -- 2. Разархивация: Если заказ вернулся в работу (не в архивном статусе), возвращаем сообщения
  UPDATE chat_messages
  SET is_archived = false
  FROM orders
  WHERE chat_messages.order_id = orders.id
  AND orders.status_manager NOT IN ('Архив', 'Аннулирован', 'Отказ', 'Выполнен', 'КП отправлено', 'Обработано вручную')
  AND chat_messages.is_archived = true;
END;
$$ LANGUAGE plpgsql;
