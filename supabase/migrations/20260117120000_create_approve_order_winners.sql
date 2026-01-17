CREATE OR REPLACE FUNCTION approve_order_winners(
    p_order_id BIGINT, 
    p_winners JSONB
)
RETURNS VOID AS $$
DECLARE
    item JSONB;
BEGIN
    -- 1. Обновляем статус заказа
    UPDATE orders 
    SET 
        status_manager = 'КП готово',
        status_client = 'КП готово',
        status_updated_at = NOW()
    WHERE id = p_order_id;

    -- 2. Проходим по массиву победителей
    FOR item IN SELECT * FROM jsonb_array_elements(p_winners)
    LOOP
        -- 2.1 Обновляем offer_items (фиксируем is_winner, цену и коммент)
        UPDATE offer_items
        SET 
            is_winner = true,
            admin_price = (item->>'admin_price')::NUMERIC,
            delivery_rate = (item->>'delivery_rate')::NUMERIC,
            admin_comment = (item->>'admin_comment')
        WHERE id = (item->>'id')::BIGINT;

        -- 2.2 Синхронизируем order_items (для клиента)
        WITH winner_offer AS (
            SELECT order_item_id, item_files, client_delivery_weeks 
            FROM offer_items 
            WHERE id = (item->>'id')::BIGINT
        )
        UPDATE order_items
        SET 
            admin_price = (item->>'admin_price')::NUMERIC,
            
            -- Если у победителя есть фото, копируем первое
            photo_url = CASE 
                WHEN (SELECT jsonb_array_length(item_files) FROM winner_offer) > 0 
                THEN (SELECT item_files->0->>'url' FROM winner_offer)
                ELSE photo_url 
            END,

            -- Копируем срок
            delivery_weeks = (SELECT client_delivery_weeks FROM winner_offer)
            
        FROM winner_offer
        WHERE order_items.id = winner_offer.order_item_id;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload config';
