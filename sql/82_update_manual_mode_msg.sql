CREATE OR REPLACE FUNCTION set_manual_mode(p_order_id BIGINT)
RETURNS VOID AS $$
BEGIN
    -- 1. Ставим флаг и статус
    UPDATE orders 
    SET status_manager = 'Ручная обработка', 
        status_client = 'В обработке',
        is_manual_processing = TRUE 
    WHERE id = p_order_id;
    
    -- 2. Делаем всех победителями
    UPDATE offer_items 
    SET is_winner = TRUE 
    WHERE offer_id IN (SELECT id FROM offers WHERE order_id = p_order_id);

    -- 3. (NEW) Отправляем системное сообщение в чат
    INSERT INTO chat_messages (order_id, sender_role, sender_name, recipient_name, message, is_read)
    VALUES (
        p_order_id, 
        'ADMIN', 
        'Manager', 
        'OPERATOR', 
        'Заказ #' || p_order_id || ' переведен в ручную обработку. Ознакомиться с ним можно в разделе "Ручная обработка".', 
        false
    );
END;
$$ LANGUAGE plpgsql;