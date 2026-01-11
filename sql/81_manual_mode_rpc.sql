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
END;
$$ LANGUAGE plpgsql;