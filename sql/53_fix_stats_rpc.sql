-- FIX STATS & TRIGGERS (Migration from admin_price_rub to admin_price)

-- 1. ТРИГГЕР 1: КП ВЫСТАВЛЕНО
CREATE OR REPLACE FUNCTION public.trigger_on_kp_sent()
RETURNS TRIGGER AS $$
DECLARE
    r_offer RECORD;
    v_offer_sum NUMERIC;
    v_month DATE;
BEGIN
    IF NEW.status_admin IN ('КП готово', 'КП отправлено') AND (OLD.status_admin NOT IN ('КП готово', 'КП отправлено') OR OLD.status_admin IS NULL) THEN
        v_month := date_trunc('month', CURRENT_DATE);

        FOR r_offer IN 
            SELECT id, created_by 
            FROM public.offers 
            WHERE order_id = NEW.id AND created_by IS NOT NULL
        LOOP
            -- UPDATED: Use admin_price
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

-- 2. ТРИГГЕР 2: ПОБЕДА
CREATE OR REPLACE FUNCTION public.trigger_on_offer_win()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_month DATE;
    v_already_has_winner BOOLEAN;
    v_price NUMERIC;
BEGIN
    IF NEW.is_winner = TRUE AND (OLD.is_winner = FALSE OR OLD.is_winner IS NULL) THEN
        
        SELECT created_by INTO v_user_id
        FROM public.offers
        WHERE id = NEW.offer_id;

        -- UPDATED: Use admin_price
        IF v_user_id IS NOT NULL AND NEW.admin_price IS NOT NULL THEN
            v_month := date_trunc('month', CURRENT_DATE);
            v_price := NEW.admin_price;

            SELECT EXISTS (
                SELECT 1 
                FROM public.offer_items 
                WHERE offer_id = NEW.offer_id 
                  AND is_winner = TRUE 
                  AND id != NEW.id 
            ) INTO v_already_has_winner;

            INSERT INTO public.monthly_buyer_stats (user_id, month_date, won_count, won_sum)
            VALUES (v_user_id, v_month, 1, v_price)
            ON CONFLICT (user_id, month_date) DO UPDATE SET
                won_count = monthly_buyer_stats.won_count + (CASE WHEN v_already_has_winner THEN 0 ELSE 1 END),
                won_sum = monthly_buyer_stats.won_sum + EXCLUDED.won_sum,
                updated_at = now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. RPC ФУНКЦИЯ (Обновление не требуется, если она читает только monthly_buyer_stats, но пересоздадим для надежности)
CREATE OR REPLACE FUNCTION get_buyer_dashboard_stats(
    p_user_id UUID, 
    p_month_date DATE DEFAULT date_trunc('month', CURRENT_DATE)
)
RETURNS JSON AS $$
DECLARE
    v_dept_turnover NUMERIC;
    v_personal_stats RECORD;
    v_leader_qty RECORD;
    v_leader_sum RECORD;
    v_result JSON;
BEGIN
    -- 1. Оборот отдела
    SELECT COALESCE(SUM(kp_sum), 0) INTO v_dept_turnover
    FROM public.monthly_buyer_stats
    WHERE month_date = p_month_date;

    -- 2. Личная статистика
    SELECT * INTO v_personal_stats
    FROM public.monthly_buyer_stats
    WHERE user_id = p_user_id AND month_date = p_month_date;

    IF NOT FOUND THEN
        SELECT 0, 0, 0, 0 INTO v_personal_stats.kp_count, v_personal_stats.kp_sum, v_personal_stats.won_count, v_personal_stats.won_sum;
    END IF;

    -- 3. Лидеры (Top 1)
    SELECT u.name, s.kp_count 
    INTO v_leader_qty
    FROM public.monthly_buyer_stats s
    JOIN public.app_users u ON s.user_id = u.id
    WHERE s.month_date = p_month_date
    ORDER BY s.kp_count DESC
    LIMIT 1;

    SELECT u.name, s.kp_sum 
    INTO v_leader_sum
    FROM public.monthly_buyer_stats s
    JOIN public.app_users u ON s.user_id = u.id
    WHERE s.month_date = p_month_date
    ORDER BY s.kp_sum DESC
    LIMIT 1;

    v_result := json_build_object(
        'department', json_build_object('turnover', v_dept_turnover),
        'personal', json_build_object(
            'kp_count', COALESCE(v_personal_stats.kp_count, 0),
            'kp_sum', COALESCE(v_personal_stats.kp_sum, 0),
            'won_count', COALESCE(v_personal_stats.won_count, 0),
            'won_sum', COALESCE(v_personal_stats.won_sum, 0)
        ),
        'leaders', json_build_object(
            'quantity_leader', COALESCE(v_leader_qty.name, '-'),
            'quantity_val', COALESCE(v_leader_qty.kp_count, 0),
            'sum_leader', COALESCE(v_leader_sum.name, '-'),
            'sum_val', COALESCE(v_leader_sum.kp_sum, 0)
        )
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
