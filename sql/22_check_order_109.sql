-- Проверка данных по заказу 109 (Исправленная версия)
SELECT 
  oi.id, 
  oi.offer_id, 
  oi.name, 
  oi.price as seller_price, 
  oi.admin_price, 
  oi.is_winner, 
  -- oi.delivery_rate, -- Эту колонку убрали, так как её нет
  oi.delivery_days 
FROM public.offer_items oi
JOIN public.offers o ON oi.offer_id = o.id
WHERE o.order_id = 109;