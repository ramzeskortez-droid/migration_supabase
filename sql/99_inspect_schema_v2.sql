-- 1. СПИСОК ТАБЛИЦ И КОЛОНОК
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM 
    information_schema.tables t
JOIN 
    information_schema.columns c ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public'
ORDER BY 
    t.table_name, c.ordinal_position;

-- 2. СПИСОК ТРИГГЕРОВ
SELECT 
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing,
    action_statement AS definition
FROM 
    information_schema.triggers
WHERE 
    event_object_schema = 'public'
ORDER BY 
    table_name, trigger_name;

-- 3. СПИСОК RLS ПОЛИТИК
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    schemaname = 'public'
ORDER BY 
    tablename, policyname;

-- 4. СПИСОК ФУНКЦИЙ (RPC)
SELECT 
    routine_name,
    data_type AS return_type
FROM 
    information_schema.routines
WHERE 
    routine_schema = 'public'
ORDER BY 
    routine_name;
