-- sql/46_inspect_users.sql
-- Проверка структуры таблицы пользователей
SELECT 
    column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'app_users';

-- Проверка ограничений (Unique, PK)
SELECT 
    conname as constraint_name, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'app_users'::regclass;

-- Просмотр данных
SELECT * FROM app_users LIMIT 10;
