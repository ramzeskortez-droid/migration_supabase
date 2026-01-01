-- Обновленная функция утверждения с записью ВРЕМЕНИ (status_updated_at)
CREATE OR REPLACE FUNCTION public.approve_order_winners(
    p_order_id BIGINT,
    p_winners JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    w_item JSONB;
    w_id BIGINT;
    w_price NUMERIC;
    w_currency TEXT;
    w_delivery NUMERIC;
    w_comment TEXT;
    w_item_name TEXT;
BEGIN
    -- А. Обновляем статус заказа и ВРЕМЯ ОБНОВЛЕНИЯ
    UPDATE public.orders
    SET 
        status_client = 'КП отправлено',
        status_admin = 'КП готово',
        status_updated_at = timezone('utc'::text, now()) -- <--- ВАЖНО: Обновляем время
    WHERE id = p_order_id;

    -- Б. Обрабатываем победителей
    FOR w_item IN SELECT * FROM jsonb_array_elements(p_winners)
    LOOP
        w_id := (w_item->>'id')::BIGINT;
        w_price := (w_item->>'admin_price')::NUMERIC;
        w_currency := (w_item->>'admin_currency')::TEXT;
        w_delivery := (w_item->>'delivery_rate')::NUMERIC;
        w_comment := (w_item->>'admin_comment')::TEXT;

        SELECT name INTO w_item_name FROM public.offer_items WHERE id = w_id;

        UPDATE public.offer_items oi
        SET is_winner = FALSE
        FROM public.offers o
        WHERE oi.offer_id = o.id
          AND o.order_id = p_order_id
          AND oi.name = w_item_name;

        UPDATE public.offer_items
        SET 
            is_winner = TRUE,
            admin_price = w_price,
            admin_currency = w_currency,
            delivery_rate = w_delivery,
            admin_comment = w_comment
        WHERE id = w_id;
        
    END LOOP;
END;
$$;