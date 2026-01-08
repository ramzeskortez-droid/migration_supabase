-- ПЕРЕСЧЕТ СТАТИСТИКИ (RECALC)
-- Запускать один раз для восстановления данных после сбоя триггеров.

-- 1. Очистка текущей статистики
TRUNCATE TABLE public.monthly_buyer_stats;

-- 2. Пересчет "КП ВЫСТАВЛЕНО" (kp_count, kp_sum)
-- Ищем все офферы в заказах со статусом 'КП готово' или 'КП отправлено'
INSERT INTO public.monthly_buyer_stats (user_id, month_date, kp_count, kp_sum, won_count, won_sum)
SELECT 
    o.created_by AS user_id,
    date_trunc('month', ord.status_updated_at) AS month_date, -- Месяц события
    COUNT(DISTINCT o.id) AS kp_count,
    SUM(oi.admin_price) AS kp_sum,
    0 AS won_count,
    0 AS won_sum
FROM public.offers o
JOIN public.orders ord ON o.order_id = ord.id
JOIN public.offer_items oi ON o.id = oi.offer_id
WHERE 
    ord.status_admin IN ('КП готово', 'КП отправлено') 
    AND o.created_by IS NOT NULL
    AND ord.status_updated_at IS NOT NULL
GROUP BY o.created_by, date_trunc('month', ord.status_updated_at)
ON CONFLICT (user_id, month_date) DO UPDATE SET
    kp_count = EXCLUDED.kp_count,
    kp_sum = EXCLUDED.kp_sum;


-- 3. Пересчет "ВЫИГРАННЫЕ СДЕЛКИ" (won_count, won_sum)
-- Ищем все выигравшие позиции
WITH win_stats AS (
    SELECT 
        o.created_by AS user_id,
        date_trunc('month', ord.status_updated_at) AS month_date,
        COUNT(DISTINCT o.id) AS won_deals_count, -- Количество сделок (офферов), где есть победа
        SUM(oi.admin_price) AS won_money_sum
    FROM public.offer_items oi
    JOIN public.offers o ON oi.offer_id = o.id
    JOIN public.orders ord ON o.order_id = ord.id
    WHERE 
        oi.is_winner = TRUE
        AND o.created_by IS NOT NULL
        AND ord.status_updated_at IS NOT NULL
    GROUP BY o.created_by, date_trunc('month', ord.status_updated_at)
)
INSERT INTO public.monthly_buyer_stats (user_id, month_date, won_count, won_sum)
SELECT user_id, month_date, won_deals_count, won_money_sum FROM win_stats
ON CONFLICT (user_id, month_date) DO UPDATE SET
    won_count = EXCLUDED.won_count,
    won_sum = EXCLUDED.won_sum;
