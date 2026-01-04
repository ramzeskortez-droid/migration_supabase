-- Функция для автоматического расчета стоимости позиции (Цена * Кол-во + Доставка)
-- Имя функции станет именем "виртуальной колонки" при запросе: total_cost
CREATE OR REPLACE FUNCTION public.total_cost(item public.offer_items)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT (
    COALESCE(item.admin_price, item.price, 0) * item.quantity 
    + 
    COALESCE(item.delivery_rate, 0)
  );
$$;

-- Дополнительно: Функция для расчета чистой стоимости товара (без доставки)
CREATE OR REPLACE FUNCTION public.goods_cost(item public.offer_items)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT (
    COALESCE(item.admin_price, item.price, 0) * item.quantity
  );
$$;