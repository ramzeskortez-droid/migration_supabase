-- sql/47_user_moderation_and_constraints.sql
-- 1. Добавляем колонку статуса для модерации
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- 2. Делаем существующих пользователей одобренными, чтобы не заблокировать систему
UPDATE app_users SET status = 'approved' WHERE status = 'pending';

-- 3. Удаляем старое ограничение уникальности только по токену
-- Обычно Postgres называет его так: имятаблицы_имяколонки_key
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_token_key;

-- 4. Добавляем новое составное ограничение уникальности (Имя + Телефон + Токен)
-- Это позволит разным людям иметь одинаковый токен, но защитит от дублей конкретного человека
ALTER TABLE app_users ADD CONSTRAINT app_users_identity_key UNIQUE (name, phone, token);
