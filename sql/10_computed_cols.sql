-- Функция для вычисляемой колонки 'offers_count'
-- Позволяет сортировать по количеству офферов: .order('offers_count')
CREATE OR REPLACE FUNCTION offers_count(orders_row orders)
RETURNS bigint AS $$
  SELECT COUNT(*) FROM offers WHERE order_id = orders_row.id;
$$ LANGUAGE sql STABLE;
