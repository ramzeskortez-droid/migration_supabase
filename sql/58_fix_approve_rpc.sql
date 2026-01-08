-- Fix approve_order_winners: remove admin_currency and use correct column names
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
    w_delivery NUMERIC;
    w_comment TEXT;
BEGIN
    -- 1. Update Order Status
    UPDATE public.orders
    SET 
        status_client = 'КП отправлено',
        status_admin = 'КП готово',
        status_updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- 2. Reset ALL winners for this order
    UPDATE public.offer_items oi
    SET is_winner = FALSE
    FROM public.offers o
    WHERE oi.offer_id = o.id
      AND o.order_id = p_order_id;

    -- 3. Loop through winners
    FOR w_item IN SELECT * FROM jsonb_array_elements(p_winners)
    LOOP
        w_id := (w_item->>'id')::BIGINT;
        w_price := (w_item->>'admin_price')::NUMERIC;
        w_delivery := (w_item->>'delivery_rate')::NUMERIC;
        w_comment := (w_item->>'admin_comment')::TEXT;

        -- Set winner
        UPDATE public.offer_items
        SET 
            is_winner = TRUE,
            admin_price = w_price,
            delivery_rate = w_delivery,
            admin_comment = w_comment
        WHERE id = w_id;

        -- Sync with order_items (denormalization)
        -- We join offer_items to find the correct order_item_id
        UPDATE public.order_items oi
        SET admin_price = w_price
        FROM public.offer_items off
        WHERE oi.order_id = p_order_id 
          AND off.id = w_id
          AND oi.id = off.order_item_id;
        
    END LOOP;
END;
$$;
