-- Inspect app_users table schema
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'app_users';

-- Inspect constraints (Unique, Primary Key) on app_users
SELECT 
    conname as constraint_name, 
    contype as constraint_type, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'app_users'::regclass;

-- Inspect indexes on app_users
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'app_users';

-- Preview data (first 5 rows)
SELECT * FROM app_users LIMIT 5;
