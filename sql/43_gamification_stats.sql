-- MIGRATION: GAMIFICATION & KPI SYSTEM
-- Цель: Внедрение системы статистики для закупщиков (KPI, Leaderboard)

-- 1. Добавляем авторство в Офферы
-- Теперь мы точно знаем, какой user_id (из app_users) создал оффер
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.app_users(id);

-- Индекс для быстрого поиска офферов конкретного юзера
CREATE INDEX IF NOT EXISTS idx_offers_created_by ON public.offers(created_by);


-- 2. Таблица статистики (Кэш)
-- Собирает агрегированные данные по месяцам.
-- Принцип "Чистого листа": заполняется триггерами с момента деплоя.
CREATE TABLE IF NOT EXISTS public.monthly_buyer_stats (
    user_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
    month_date DATE NOT NULL, -- Первое число месяца (2026-01-01)
    
    kp_count INTEGER DEFAULT 0, -- Количество офферов, попавших в "КП Готово"
    kp_sum NUMERIC DEFAULT 0,   -- Сумма admin_price этих офферов
    
    won_count INTEGER DEFAULT 0, -- Количество офферов с победами
    won_sum NUMERIC DEFAULT 0,   -- Сумма admin_price выигравших позиций
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    PRIMARY KEY (user_id, month_date)
);


-- 3. ТРИГГЕР 1: КП ВЫСТАВЛЕНО (Смена статуса заказа)
-- Логика: Когда менеджер переводит заказ в "КП готово", мы считаем это успехом для всех участников.
CREATE OR REPLACE FUNCTION public.trigger_on_kp_sent()
RETURNS TRIGGER AS $$
DECLARE
    r_offer RECORD;
    v_offer_sum NUMERIC;
    v_month DATE;
BEGIN
    -- Срабатываем только при переходе в статус "КП готово" (или аналог) из любого другого
    -- Учитываем вариации статуса (по ТЗ workflowStatus)
    IF NEW.status_admin IN ('КП готово', 'КП отправлено') AND (OLD.status_admin NOT IN ('КП готово', 'КП отправлено') OR OLD.status_admin IS NULL) THEN
        
        v_month := date_trunc('month', CURRENT_DATE);

        -- Ищем всех авторов офферов в этом заказе
        FOR r_offer IN 
            SELECT id, created_by 
            FROM public.offers 
            WHERE order_id = NEW.id AND created_by IS NOT NULL
        LOOP
            -- Считаем сумму admin_price для этого оффера (только обработанные позиции)
            SELECT COALESCE(SUM(admin_price), 0)
            INTO v_offer_sum
            FROM public.offer_items
            WHERE offer_id = r_offer.id;

            -- Если сумма > 0 (значит менеджер обработал хоть что-то), обновляем статистику
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

DROP TRIGGER IF EXISTS tr_kp_sent ON public.orders;
CREATE TRIGGER tr_kp_sent
AFTER UPDATE OF status_admin ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_on_kp_sent();


-- 4. ТРИГГЕР 2: ПОБЕДА (Выбор лидера)
-- Логика: Когда позиция становится winner=true
CREATE OR REPLACE FUNCTION public.trigger_on_offer_win()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_month DATE;
    v_already_has_winner BOOLEAN;
    v_price NUMERIC;
BEGIN
    -- Срабатываем только когда is_winner меняется на TRUE
    IF NEW.is_winner = TRUE AND (OLD.is_winner = FALSE OR OLD.is_winner IS NULL) THEN
        
        -- Находим автора оффера
        SELECT created_by INTO v_user_id
        FROM public.offers
        WHERE id = NEW.offer_id;

        -- Если автор есть и цена админа задана (она должна быть источником правды)
        IF v_user_id IS NOT NULL AND NEW.admin_price IS NOT NULL THEN
            v_month := date_trunc('month', CURRENT_DATE);
            v_price := NEW.admin_price;

            -- Проверяем, были ли УЖЕ победители в этом оффере (чтобы не накручивать счетчик сделок won_count)
            -- Нам нужно проверить ДРУГИЕ позиции в этом же оффере
            SELECT EXISTS (
                SELECT 1 
                FROM public.offer_items 
                WHERE offer_id = NEW.offer_id 
                  AND is_winner = TRUE 
                  AND id != NEW.id -- Исключаем текущую, она уже winner (или еще нет в базе при BEFORE? Trigger is AFTER usually better, but let's assume update logic)
            ) INTO v_already_has_winner;

            -- Обновляем статистику
            INSERT INTO public.monthly_buyer_stats (user_id, month_date, won_count, won_sum)
            VALUES (v_user_id, v_month, 1, v_price)
            ON CONFLICT (user_id, month_date) DO UPDATE SET
                -- Увеличиваем счетчик сделок только если это первая победа в оффере
                won_count = monthly_buyer_stats.won_count + (CASE WHEN v_already_has_winner THEN 0 ELSE 1 END),
                won_sum = monthly_buyer_stats.won_sum + EXCLUDED.won_sum,
                updated_at = now();
        END IF;
    END IF;
    
    -- Обработка отмены победы (если сняли галочку) - ОПЦИОНАЛЬНО, ПОКА ПРОПУСТИМ ДЛЯ ПРОСТОТЫ
    -- (Чтобы сделать полноценно, нужно вычитать сумму и декрементить count если это была последняя позиция)

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_offer_win ON public.offer_items;
CREATE TRIGGER tr_offer_win
AFTER UPDATE OF is_winner ON public.offer_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_on_offer_win();


-- 5. RPC Функция для получения данных дашборда
-- Возвращает JSON структуру для фронтенда
CREATE OR REPLACE FUNCTION get_buyer_dashboard_stats(p_month_date DATE DEFAULT date_trunc('month', CURRENT_DATE))
RETURNS JSON AS $$
DECLARE
    v_dept_turnover NUMERIC;
    v_personal JSON;
    v_leaders JSON;
    v_user_id UUID; -- Текущий юзер (из контекста)
BEGIN
    -- Пытаемся получить ID текущего пользователя из Supabase Auth или нашего заголовка
    -- В нашей системе мы эмулируем токены через app_users, поэтому фронт должен передавать user_id как параметр?
    -- Нет, лучше сделаем получение user_id внутри, если используем RLS, но у нас кастомная авторизация.
    -- УПРОЩЕНИЕ: Функция будет принимать user_id как параметр (или извлекать из заголовка, если бы был RLS).
    -- ДЛЯ ТЕКУЩЕЙ ЗАДАЧИ: Пусть функция смотрит на current_setting, который мы будем ставить в сервисе, 
    -- ИЛИ просто сделаем параметр p_user_id. Сделаем параметр для гибкости.
    
    -- ! ВАЖНО: Мы переопределяем сигнатуру функции ниже, чтобы добавить p_user_id
    RETURN '{}'::json; 
END;
$$ LANGUAGE plpgsql;

-- Правильная сигнатура с p_user_id
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
    -- 1. Оборот отдела (Сумма всех KP Sum за месяц)
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

    -- 3. Лидеры
    -- По количеству
    SELECT u.name, s.kp_count 
    INTO v_leader_qty
    FROM public.monthly_buyer_stats s
    JOIN public.app_users u ON s.user_id = u.id
    WHERE s.month_date = p_month_date
    ORDER BY s.kp_count DESC
    LIMIT 1;

    -- По сумме
    SELECT u.name, s.kp_sum 
    INTO v_leader_sum
    FROM public.monthly_buyer_stats s
    JOIN public.app_users u ON s.user_id = u.id
    WHERE s.month_date = p_month_date
    ORDER BY s.kp_sum DESC
    LIMIT 1;

    -- Сборка JSON
    v_result := json_build_object(
        'department', json_build_object(
            'turnover', v_dept_turnover
        ),
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
