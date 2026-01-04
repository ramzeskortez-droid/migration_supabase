-- Функция для отладки
CREATE OR REPLACE FUNCTION public.debug_seller_feed(p_seller_name TEXT)
RETURNS TABLE (info TEXT, val TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_orders BIGINT;
    v_open_orders BIGINT;
    v_my_offers_count BIGINT;
    v_sample_status TEXT;
    v_sample_offer_name TEXT;
BEGIN
    -- 1. Всего заказов
    SELECT COUNT(*) INTO v_total_orders FROM public.orders;
    RETURN QUERY SELECT 'Total Orders'::TEXT, v_total_orders::TEXT;

    -- 2. Открытых заказов (проверка статусов)
    SELECT COUNT(*) INTO v_open_orders FROM public.orders 
    WHERE status_admin NOT IN ('ЗАКРЫТ', 'Аннулирован', 'Отказ', 'Выполнен', 'В пути');
    RETURN QUERY SELECT 'Open Orders (Filtered)'::TEXT, v_open_orders::TEXT;

    -- 3. Пример статуса одного заказа
    SELECT status_admin INTO v_sample_status FROM public.orders LIMIT 1;
    RETURN QUERY SELECT 'Sample Status'::TEXT, v_sample_status::TEXT;

    -- 4. Сколько офферов с таким именем (проверка ILIKE)
    SELECT COUNT(*) INTO v_my_offers_count FROM public.offers 
    WHERE TRIM(supplier_name) ILIKE TRIM(p_seller_name);
    RETURN QUERY SELECT 'Offers Found for Seller'::TEXT, v_my_offers_count::TEXT;

    -- 5. Пример имени поставщика из базы (первый попавшийся)
    SELECT supplier_name INTO v_sample_offer_name FROM public.offers LIMIT 1;
    RETURN QUERY SELECT 'Sample Offer Name in DB'::TEXT, v_sample_offer_name::TEXT;
    
    -- 6. Что мы искали
    RETURN QUERY SELECT 'Searching For'::TEXT, p_seller_name;
END;
$$;