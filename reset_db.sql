-- Функция для полной очистки базы и сброса счетчиков ID
CREATE OR REPLACE FUNCTION reset_db()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Разрешает выполнение с правами создателя функции
AS $$
BEGIN
  -- TRUNCATE удаляет всё из таблицы мгновенно
  -- RESTART IDENTITY сбрасывает счетчик ID на 1
  -- CASCADE удаляет зависимые данные (товары, офферы)
  TRUNCATE TABLE public.orders RESTART IDENTITY CASCADE;
END;
$$;