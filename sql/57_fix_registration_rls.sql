-- Разрешить любому пользователю подавать заявку на регистрацию
-- Это исправит ошибку "new row violates row-level security policy for table app_users"
CREATE POLICY "Allow anonymous registration" 
ON public.app_users 
FOR INSERT 
WITH CHECK (true);

-- Убедимся, что чтение разрешено для проверки статуса
-- (Обычно уже есть, но на всякий случай)
CREATE POLICY "Allow public read for status check" 
ON public.app_users 
FOR SELECT 
USING (true);
