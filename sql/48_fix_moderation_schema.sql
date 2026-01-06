-- sql/48_fix_moderation_schema.sql
-- 1. Безопасное добавление колонки статуса (если её нет)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- 2. Устанавливаем статус 'approved' всем текущим пользователям, чтобы они появились в списке
UPDATE app_users SET status = 'approved' WHERE status = 'pending' OR status IS NULL;

-- 3. ПРИМЕЧАНИЕ: Ограничение уникальности токена пока НЕ трогаем, 
-- так как на нем держатся связи с таблицами orders и labels. 
-- Сначала нужно решить вопрос архитектуры (переход на user_id), иначе сломается изоляция данных.
