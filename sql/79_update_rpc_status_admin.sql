-- 1. Обновление approve_order_winners
CREATE OR REPLACE FUNCTION approve_order_winners(p_order_id BIGINT, p_winners JSONB)
RETURNS VOID AS $$
DECLARE
    w JSONB;
BEGIN
    -- Сброс
    UPDATE offer_items
    SET is_winner = false,
        admin_price = NULL,
        delivery_rate = 0,
        admin_comment = NULL
    WHERE offer_id IN (SELECT id FROM offers WHERE order_id = p_order_id);

    UPDATE order_items
    SET admin_price = NULL
    WHERE order_id = p_order_id;

    -- Установка победителей
    FOR w IN SELECT * FROM jsonb_array_elements(p_winners)
    LOOP
        UPDATE offer_items
        SET is_winner = true,
            admin_price = (w->>'admin_price')::NUMERIC,
            delivery_rate = COALESCE((w->>'delivery_rate')::NUMERIC, 0),
            admin_comment = COALESCE(w->>'admin_comment', '')
        WHERE id = (w->>'id')::BIGINT;

        -- Обновляем родительский товар (ставим цену)
        UPDATE order_items oi
        SET admin_price = (w->>'admin_price')::NUMERIC
        FROM offer_items ofi
        WHERE ofi.id = (w->>'id')::BIGINT AND oi.id = ofi.order_item_id;
    END LOOP;

    -- Обновление статуса заказа (БЫЛО status_admin -> status_manager)
    UPDATE orders
    SET status_manager = 'КП готово',
        status_updated_at = NOW()
    WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Функция авто-перехода в ручной режим
CREATE OR REPLACE FUNCTION auto_switch_to_manual() RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id FROM orders 
        WHERE status_manager = 'В обработке' 
        AND created_at < NOW() - INTERVAL '3 days'
        AND is_manual_processing = FALSE
    LOOP
        -- 1. Ставим флаг и статус
        UPDATE orders 
        SET status_manager = 'Ручная обработка', 
            is_manual_processing = TRUE 
        WHERE id = r.id;
        
        -- 2. Делаем всех ответивших поставщиков победителями
        UPDATE offer_items 
        SET is_winner = TRUE 
        WHERE offer_id IN (SELECT id FROM offers WHERE order_id = r.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
