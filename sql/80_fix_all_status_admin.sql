-- 1. get_seller_feed
CREATE OR REPLACE FUNCTION get_seller_feed(
    p_seller_name TEXT, 
    p_search TEXT, 
    p_tab TEXT, 
    p_limit INTEGER, 
    p_page INTEGER, 
    p_sort_col TEXT DEFAULT 'created_at', 
    p_sort_dir TEXT DEFAULT 'desc',
    p_brand_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT, created_at TIMESTAMPTZ, client_name TEXT, 
    car_brand TEXT, car_model TEXT, car_year INTEGER, vin TEXT, 
    status_manager TEXT, status_client TEXT, status_supplier TEXT, 
    visible_to_client BOOLEAN, o_count BIGINT, items JSONB, 
    my_off JSONB, c_total BIGINT, c_new BIGINT, c_history BIGINT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INTEGER := (p_page - 1) * p_limit;
    v_search_safe TEXT := COALESCE(p_search, '');
    v_search_pattern TEXT := '%' || v_search_safe || '%';
    v_sql TEXT;
    v_sort_clause TEXT;
BEGIN
    IF p_sort_col = 'id' THEN v_sort_clause := 'ct.id';
    ELSIF p_sort_col = 'brand' THEN v_sort_clause := 'ct.car_brand';
    ELSIF p_sort_col = 'model' THEN v_sort_clause := 'ct.car_model';
    ELSE v_sort_clause := 'ct.created_at'; END IF;

    IF p_sort_dir = 'asc' THEN v_sort_clause := v_sort_clause || ' ASC';
    ELSE v_sort_clause := v_sort_clause || ' DESC'; END IF;

    v_sql := '
    WITH base_orders AS (
        SELECT 
            o.*,
            (SELECT COUNT(*) FROM public.offers off WHERE off.order_id = o.id) as o_count,
            (
                SELECT row_to_json(off_data)::jsonb
                FROM (
                    SELECT 
                        off.id, 
                        off.supplier_name, 
                        (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    ''id'', ofi.id,
                                    ''name'', ofi.name,
                                    ''quantity'', ofi.quantity,
                                    ''sellerPrice'', ofi.price,
                                    ''weight'', ofi.weight,
                                    ''deliveryWeeks'', ofi.delivery_days / 7,
                                    ''photoUrl'', ofi.photo_url,
                                    ''offeredQuantity'', ofi.quantity,
                                    ''rank'', CASE WHEN ofi.is_winner THEN ''ЛИДЕР'' ELSE '''' END,
                                    ''adminComment'', ofi.admin_comment
                                )
                            )
                            FROM public.offer_items ofi
                            WHERE ofi.offer_id = off.id
                        ) as items
                    FROM public.offers off
                    WHERE off.order_id = o.id AND TRIM(off.supplier_name) ILIKE TRIM($1)
                    LIMIT 1
                ) off_data
            ) as my_off
        FROM public.orders o
        WHERE 
            ($2 = '''' OR (
                o.vin ILIKE $3 OR
                o.id::TEXT ILIKE $3 OR
                o.car_model ILIKE $3 OR
                o.car_brand ILIKE $3 OR
                EXISTS (
                    SELECT 1 FROM public.order_items oi 
                    WHERE oi.order_id = o.id AND oi.name ILIKE $3
                )
            ))
            AND ($7 IS NULL OR o.car_brand ILIKE $7)
    ),
    tab_new AS (
        SELECT * FROM base_orders 
        WHERE my_off IS NULL 
          AND status_manager NOT IN (''ЗАКРЫТ'', ''Аннулирован'', ''Отказ'', ''Выполнен'', ''В пути'')
    ),
    tab_history AS (
        SELECT * FROM base_orders WHERE my_off IS NOT NULL
    ),
    current_tab AS (
        SELECT * FROM 
        CASE 
            WHEN $4 = ''new'' THEN (SELECT * FROM tab_new)
            WHEN $4 = ''history'' THEN (SELECT * FROM tab_history)
            ELSE NULL
        END t
    ),
    counts AS (
        SELECT 
            (SELECT COUNT(*) FROM tab_new) as c_new,
            (SELECT COUNT(*) FROM tab_history) as c_history
    )
    SELECT 
        ct.id, ct.created_at, ct.client_name, ct.car_brand, ct.car_model, ct.car_year, ct.vin, 
        ct.status_manager, ct.status_client, ct.status_supplier, ct.visible_to_client, ct.o_count,
        (SELECT jsonb_agg(jsonb_build_object(''id'', oi.id, ''name'', oi.name, ''quantity'', oi.quantity, ''category'', oi.category)) FROM public.order_items oi WHERE oi.order_id = ct.id) as items,
        ct.my_off,
        (SELECT COUNT(*) FROM current_tab) as c_total,
        c.c_new, c.c_history
    FROM current_tab ct, counts c
    ORDER BY ' || v_sort_clause || '
    LIMIT $5 OFFSET $6';

    RETURN QUERY EXECUTE v_sql 
    USING p_seller_name, v_search_safe, v_search_pattern, p_tab, p_limit, v_offset, p_brand_filter;
END;
$$;

-- 2. get_seller_brands
CREATE OR REPLACE FUNCTION get_seller_brands(p_seller_name TEXT)
RETURNS TABLE (car_brand TEXT) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT o.car_brand
    FROM public.orders o
    WHERE 
       status_manager NOT IN ('ЗАКРЫТ', 'Аннулирован', 'Отказ', 'Выполнен', 'В пути')
       AND NOT EXISTS (
           SELECT 1 FROM public.offers off 
           WHERE off.order_id = o.id 
           AND TRIM(off.supplier_name) ILIKE TRIM(p_seller_name)
       )
    ORDER BY o.car_brand;
END;
$$;

-- 3. auto_archive_chats
CREATE OR REPLACE FUNCTION auto_archive_chats() RETURNS void AS $$
BEGIN
  -- 1. По времени
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

  -- 2. По статусу
  UPDATE chat_messages cm
  SET is_archived = true
  FROM orders o
  WHERE cm.order_id = o.id
  AND cm.is_archived = false
  AND (
      o.status_manager NOT IN ('В обработке')
      OR
      o.status_supplier NOT IN ('Сбор предложений', 'Сбор офферов')
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Триггерная функция trigger_on_kp_sent
CREATE OR REPLACE FUNCTION trigger_on_kp_sent() RETURNS TRIGGER AS $$
DECLARE
    r_offer RECORD;
    v_offer_sum NUMERIC;
    v_month DATE;
BEGIN
    IF NEW.status_manager IN ('КП готово', 'КП отправлено') AND (OLD.status_manager NOT IN ('КП готово', 'КП отправлено') OR OLD.status_manager IS NULL) THEN
        v_month := date_trunc('month', CURRENT_DATE);

        FOR r_offer IN 
            SELECT id, created_by 
            FROM public.offers 
            WHERE order_id = NEW.id AND created_by IS NOT NULL
        LOOP
            SELECT COALESCE(SUM(admin_price), 0)
            INTO v_offer_sum
            FROM public.offer_items
            WHERE offer_id = r_offer.id;

            IF v_offer_sum > 0 THEN
                INSERT INTO public.monthly_buyer_stats (user_id, month_date, kp_count, kp_sum)
                VALUES (r_offer.created_by, v_month, 1, v_offer_sum)
                ON CONFLICT (user_id, month_date) DO UPDATE SET
                    kp_count = monthly_buyer_stats.kp_count + 1,
                    kp_sum = monthly_buyer_stats.kp_sum + EXCLUDED.kp_sum,
                    updated_at = now();
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;