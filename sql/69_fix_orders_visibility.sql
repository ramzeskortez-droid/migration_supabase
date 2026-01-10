-- Убеждаемся, что закупщики могут видеть все активные заказы
DROP POLICY IF EXISTS "Buyers can view active orders" ON orders;

CREATE POLICY "Buyers can view active orders"
ON orders FOR SELECT
TO authenticated
USING (
  -- Закупщик видит заказ, если он в обработке
  status_admin = 'В обработке' 
  -- ИЛИ если он подал на него оффер (это уже сложнее проверить в RLS без join, 
  -- обычно RLS для offers разрешает видеть свои офферы, а orders - если есть связь)
  -- Для простоты пока разрешим чтение orders всем authenticated, 
  -- так как фильтрация идет на уровне API. 
  -- Но если нужна строгость:
  OR 
  EXISTS (
    SELECT 1 FROM offers 
    WHERE offers.order_id = orders.id 
    AND offers.supplier_name = current_setting('request.jwt.claims', true)::json->>'phone' -- Сложно привязать к токену
  )
);

-- Упрощенная политика (разрешить чтение всем авторизованным, фильтровать на бэке)
-- Это временное решение, если текущие политики слишком строгие
DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
CREATE POLICY "Enable read access for all users" ON orders FOR SELECT TO authenticated USING (true);
