-- SQL миграция для поддержки нескольких победителей и корректного сохранения цен
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
    w_price_rub NUMERIC;
BEGIN
    -- 1. Обновляем статус заказа
    UPDATE public.orders
    SET 
        status_client = 'КП отправлено',
        status_admin = 'КП готово',
        status_updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- 2. Сбрасываем ВСЕХ победителей для этого заказа ОДИН РАЗ (перед циклом)
    UPDATE public.offer_items oi
    SET is_winner = FALSE
    FROM public.offers o
    WHERE oi.offer_id = o.id
      AND o.order_id = p_order_id;

    -- 3. Обрабатываем присланный список победителей
    FOR w_item IN SELECT * FROM jsonb_array_elements(p_winners)
    LOOP
        w_id := (w_item->>'id')::BIGINT;
        w_price := (w_item->>'admin_price')::NUMERIC;
        w_currency := (w_item->>'admin_currency')::TEXT;
        w_delivery := (w_item->>'delivery_rate')::NUMERIC;
        w_comment := (w_item->>'admin_comment')::TEXT;
        w_price_rub := (w_item->>'admin_price_rub')::NUMERIC;

        -- Устанавливаем победителя
        UPDATE public.offer_items
        SET 
            is_winner = TRUE,
            admin_price = w_price,
            admin_currency = w_currency,
            delivery_rate = w_delivery,
            admin_comment = w_comment,
            admin_price_rub = w_price_rub
        WHERE id = w_id;

        -- Синхронизируем цену в таблице order_items (для упрощения отображения в листинге)
        -- Если победителей несколько, в order_items попадет цена последнего (это допустимое поведение для денормализации)
        UPDATE public.order_items
        SET admin_price_rub = w_price_rub
        WHERE order_id = p_order_id 
          AND name = (SELECT name FROM public.offer_items WHERE id = w_id);
        
    END LOOP;
END;
$$;
