-- Функция для получения списка брендов, доступных поставщику
CREATE OR REPLACE FUNCTION public.get_seller_brands(p_seller_name TEXT)
RETURNS TABLE (brand TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT car_brand
    FROM public.orders o
    WHERE 
       -- Условия как для таба 'new' (то, что можно взять в работу)
       status_admin NOT IN ('ЗАКРЫТ', 'Аннулирован', 'Отказ', 'Выполнен', 'В пути')
       AND NOT EXISTS (
           SELECT 1 FROM public.offers off 
           WHERE off.order_id = o.id 
           AND TRIM(off.supplier_name) ILIKE TRIM(p_seller_name)
       )
    ORDER BY car_brand;
END;
$$;