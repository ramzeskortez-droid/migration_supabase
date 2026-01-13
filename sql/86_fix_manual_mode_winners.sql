CREATE OR REPLACE FUNCTION set_manual_mode(p_order_id BIGINT)
RETURNS VOID AS $$
BEGIN
    -- 1. Ставим флаг и статус
    UPDATE orders 
    SET status_manager = 'Ручная обработка', 
        status_client = 'В обработке',
        is_manual_processing = TRUE,
        status_updated_at = NOW()
    WHERE id = p_order_id;
    
    -- 2. УБРАНО: Больше не делаем всех победителями автоматически!
    -- Логика выбора победителей теперь управляется клиентом (или остается пустой)

    -- 3. Отправляем системное сообщение в чат
    INSERT INTO chat_messages (order_id, sender_role, sender_name, recipient_name, message, is_read)
    VALUES (
        p_order_id, 
        'ADMIN', 
        'Manager', 
        'OPERATOR', 
        'Заказ #' || p_order_id || ' переведен в ручную обработку.', 
        false
    );
END;
$$ LANGUAGE plpgsql;