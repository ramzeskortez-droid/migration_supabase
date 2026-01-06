-- Обновление функции очистки БД
-- Теперь она должна очищать и статистику закупщиков (KPI)

CREATE OR REPLACE FUNCTION reset_db()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Очищаем заказы (каскадно удалятся order_items, offers, offer_items, buyer_order_labels, chat_messages)
  TRUNCATE TABLE public.orders RESTART IDENTITY CASCADE;

  -- 2. Очищаем статистику (она не привязана к заказам жестко, так что чистим отдельно)
  TRUNCATE TABLE public.monthly_buyer_stats RESTART IDENTITY CASCADE;
  
  -- 3. (Опционально) Очищаем чаты, если они вдруг остались висеть (хотя они привязаны к orders)
  -- TRUNCATE TABLE public.chat_messages RESTART IDENTITY CASCADE; 
END;
$$;