-- АУДИТ ДАННЫХ СТАТИСТИКИ
-- 1. Содержимое таблицы кеша статистики
SELECT * FROM public.monthly_buyer_stats;

-- 2. Список закупщиков и их UUID
SELECT id, name, role, status FROM public.app_users WHERE role = 'buyer';

-- 3. Проверка заказов, которые должны были попасть в статистику
SELECT id, status_admin, status_updated_at 
FROM public.orders 
WHERE status_admin IN ('КП готово', 'КП отправлено')
ORDER BY status_updated_at DESC NULLS LAST 
LIMIT 10;
