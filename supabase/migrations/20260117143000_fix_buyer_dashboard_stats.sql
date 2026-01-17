CREATE OR REPLACE FUNCTION get_buyer_dashboard_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    v_total_turnover NUMERIC;
    
    v_my_kp_count INT;
    v_my_kp_sum NUMERIC;
    v_my_won_count INT;
    v_my_won_sum NUMERIC;
    
    -- Leaders logic
    v_qty_leader_name TEXT;
    v_qty_leader_val INT;
    v_sum_leader_name TEXT;
    v_sum_leader_val NUMERIC;
BEGIN
    -- 1. Оборот отдела (Department Turnover)
    SELECT COALESCE(SUM(oi.admin_price), 0)
    INTO v_total_turnover
    FROM offer_items oi
    WHERE oi.is_winner = true
      AND oi.created_at >= date_trunc('month', CURRENT_DATE);

    -- 2. Мои показатели (Personal)
    -- KP Count/Sum (считаем все активные предложения)
    SELECT 
        COUNT(oi.id), 
        COALESCE(SUM(oi.admin_price), 0)
    INTO v_my_kp_count, v_my_kp_sum
    FROM offer_items oi
    JOIN offers o ON o.id = oi.offer_id
    WHERE o.created_by = p_user_id
      AND oi.price > 0
      AND oi.created_at >= date_trunc('month', CURRENT_DATE);

    -- Won Count/Sum
    SELECT 
        COUNT(oi.id), 
        COALESCE(SUM(oi.admin_price), 0)
    INTO v_my_won_count, v_my_won_sum
    FROM offer_items oi
    JOIN offers o ON o.id = oi.offer_id
    WHERE o.created_by = p_user_id
      AND oi.is_winner = true
      AND oi.created_at >= date_trunc('month', CURRENT_DATE);

    -- 3. Лидеры (Leaders)
    -- Лидер по количеству
    SELECT u.name, COUNT(oi.id)
    INTO v_qty_leader_name, v_qty_leader_val
    FROM offer_items oi
    JOIN offers o ON o.id = oi.offer_id
    JOIN app_users u ON u.id = o.created_by
    WHERE oi.is_winner = true
      AND oi.created_at >= date_trunc('month', CURRENT_DATE)
    GROUP BY u.name
    ORDER BY COUNT(oi.id) DESC
    LIMIT 1;

    -- Лидер по сумме
    SELECT u.name, SUM(oi.admin_price)
    INTO v_sum_leader_name, v_sum_leader_val
    FROM offer_items oi
    JOIN offers o ON o.id = oi.offer_id
    JOIN app_users u ON u.id = o.created_by
    WHERE oi.is_winner = true
      AND oi.created_at >= date_trunc('month', CURRENT_DATE)
    GROUP BY u.name
    ORDER BY SUM(oi.admin_price) DESC
    LIMIT 1;

    -- Сборка результата
    result := jsonb_build_object(
        'department', jsonb_build_object(
            'turnover', v_total_turnover
        ),
        'personal', jsonb_build_object(
            'kp_count', v_my_kp_count,
            'kp_sum', v_my_kp_sum,
            'won_count', v_my_won_count,
            'won_sum', v_my_won_sum
        ),
        'leaders', jsonb_build_object(
            'quantity_leader', COALESCE(v_qty_leader_name, '-'),
            'quantity_val', COALESCE(v_qty_leader_val, 0),
            'sum_leader', COALESCE(v_sum_leader_name, '-'),
            'sum_val', COALESCE(v_sum_leader_val, 0)
        )
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload config';
