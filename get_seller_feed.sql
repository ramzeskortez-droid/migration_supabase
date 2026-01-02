-- RELIABLE VERSION: Static SQL with safe sorting
CREATE OR REPLACE FUNCTION public.get_seller_feed(
    p_seller_name TEXT,
    p_tab TEXT, -- 'new' | 'history'
    p_page INTEGER,
    p_limit INTEGER,
    p_search TEXT DEFAULT '',
    p_sort_col TEXT DEFAULT 'created_at',
    p_sort_dir TEXT DEFAULT 'desc',
    p_brand_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    client_name TEXT,
    car_brand TEXT,
    car_model TEXT,
    car_year TEXT,
    vin TEXT,
    status_admin TEXT,
    status_client TEXT,
    status_supplier TEXT,
    visible_to_client BOOLEAN,
    offers_count BIGINT,
    items JSONB,
    my_offer JSONB,
    total_count BIGINT,
    count_new BIGINT,
    count_history BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER := (p_page - 1) * p_limit;
    v_search_pattern TEXT := '%' || COALESCE(p_search, '') || '%';
BEGIN
    RETURN QUERY
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
                            SELECT jsonb_agg(jsonb_build_object('id', ofi.id, 'name', ofi.name, 'quantity', ofi.quantity, 'sellerPrice', ofi.price, 'weight', ofi.weight, 'deliveryWeeks', ofi.delivery_days / 7, 'photoUrl', ofi.photo_url, 'offeredQuantity', ofi.quantity, 'rank', CASE WHEN ofi.is_winner THEN 'ЛИДЕР' ELSE '' END, 'adminComment', ofi.admin_comment))
                            FROM public.offer_items ofi
                            WHERE ofi.offer_id = off.id
                        ) as items
                    FROM public.offers off
                    WHERE off.order_id = o.id AND TRIM(off.supplier_name) ILIKE TRIM(p_seller_name)
                    LIMIT 1
                ) off_data
            ) as my_off
        FROM public.orders o
        WHERE 
            (COALESCE(p_search, '') = '' OR (
                o.vin ILIKE v_search_pattern OR
                o.id::TEXT ILIKE v_search_pattern OR
                o.car_model ILIKE v_search_pattern OR
                o.car_brand ILIKE v_search_pattern
            ))
            AND (p_brand_filter IS NULL OR o.car_brand ILIKE p_brand_filter)
    ),
    tab_new AS (
        SELECT * FROM base_orders 
        WHERE my_off IS NULL 
          AND status_admin NOT IN ('ЗАКРЫТ', 'Аннулирован', 'Отказ', 'Выполнен', 'В пути')
    ),
    tab_history AS (
        SELECT * FROM base_orders WHERE my_off IS NOT NULL
    ),
    counts AS (
        SELECT 
            (SELECT COUNT(*) FROM tab_new) as c_new,
            (SELECT COUNT(*) FROM tab_history) as c_history
    )
    SELECT 
        ct.id, ct.created_at, ct.client_name, ct.car_brand, ct.car_model, ct.car_year, ct.vin, 
        ct.status_admin, ct.status_client, ct.status_supplier, ct.visible_to_client, ct.o_count,
        (SELECT jsonb_agg(jsonb_build_object('id', oi.id, 'name', oi.name, 'quantity', oi.quantity, 'category', oi.category)) FROM public.order_items oi WHERE oi.order_id = ct.id) as items,
        ct.my_off,
        (SELECT COUNT(*) FROM (SELECT 1 FROM tab_new WHERE p_tab = 'new' UNION ALL SELECT 1 FROM tab_history WHERE p_tab = 'history') t) as c_total,
        c.c_new,
        c.c_history
    FROM (
        SELECT * FROM tab_new WHERE p_tab = 'new'
        UNION ALL
        SELECT * FROM tab_history WHERE p_tab = 'history'
    ) ct, counts c
    ORDER BY 
        CASE WHEN p_sort_dir = 'asc' THEN
            CASE 
                WHEN p_sort_col = 'id' THEN ct.id::TEXT
                WHEN p_sort_col = 'brand' THEN ct.car_brand
                WHEN p_sort_col = 'model' THEN ct.car_model
                ELSE ct.created_at::TEXT
            END
        END ASC,
        CASE WHEN p_sort_dir = 'desc' THEN
            CASE 
                WHEN p_sort_col = 'id' THEN ct.id::TEXT
                WHEN p_sort_col = 'brand' THEN ct.car_brand
                WHEN p_sort_col = 'model' THEN ct.car_model
                ELSE ct.created_at::TEXT
            END
        END DESC
    LIMIT p_limit
    OFFSET v_offset;
END;
$$;