CREATE OR REPLACE FUNCTION get_buyer_dashboard_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    v_total_market_volume NUMERIC;
    v_my_offers_count INT;
    v_my_offers_sum NUMERIC;
    v_my_wins_count INT;
    v_my_wins_sum NUMERIC;
    v_leaders JSONB;
BEGIN
    -- 1. Оборот отдела (все выигранные позиции за текущий месяц)
    SELECT COALESCE(SUM(oi.admin_price), 0)
    INTO v_total_market_volume
    FROM offer_items oi
    WHERE oi.is_winner = true
      AND oi.created_at >= date_trunc('month', CURRENT_DATE);

    -- 2. Мои показатели (через JOIN offers)
    -- КП Выставлено (считаем офферы, где цена > 0)
    SELECT 
        COUNT(oi.id), 
        COALESCE(SUM(oi.admin_price), 0)
    INTO v_my_offers_count, v_my_offers_sum
    FROM offer_items oi
    JOIN offers o ON o.id = oi.offer_id
    WHERE o.created_by = p_user_id
      AND oi.price > 0 -- Учитываем только реальные предложения
      AND oi.created_at >= date_trunc('month', CURRENT_DATE);

    -- Выигранные сделки
    SELECT 
        COUNT(oi.id), 
        COALESCE(SUM(oi.admin_price), 0)
    INTO v_my_wins_count, v_my_wins_sum
    FROM offer_items oi
    JOIN offers o ON o.id = oi.offer_id
    WHERE o.created_by = p_user_id
      AND oi.is_winner = true
      AND oi.created_at >= date_trunc('month', CURRENT_DATE);

    -- 3. Лидерборд
    SELECT jsonb_agg(t) INTO v_leaders
    FROM (
        SELECT 
            u.name, 
            COALESCE(SUM(oi.admin_price), 0) as wins_sum
        FROM offer_items oi
        JOIN offers o ON o.id = oi.offer_id
        JOIN app_users u ON u.id = o.created_by
        WHERE oi.is_winner = true
          AND oi.created_at >= date_trunc('month', CURRENT_DATE)
        GROUP BY u.name
        ORDER BY wins_sum DESC
        LIMIT 5
    ) t;

    -- Сборка результата
    result := jsonb_build_object(
        'total_market_volume', v_total_market_volume,
        'my_kpis', jsonb_build_object(
            'offers_count', v_my_offers_count,
            'offers_sum', v_my_offers_sum,
            'wins_count', v_my_wins_count,
            'wins_sum', v_my_wins_sum
        ),
        'leaders', COALESCE(v_leaders, '[]'::jsonb)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload config';
