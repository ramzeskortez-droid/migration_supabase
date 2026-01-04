-- INSPECTION SCRIPT
-- Run this in your local Supabase SQL Editor.
-- It returns a single JSON object containing the current schema definition.

WITH tables AS (
    SELECT 
        table_name,
        (
            SELECT json_agg(
                json_build_object(
                    'column_name', column_name,
                    'data_type', data_type,
                    'is_nullable', is_nullable,
                    'column_default', column_default
                ) ORDER BY ordinal_position
            )
            FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = t.table_name
        ) AS columns
    FROM information_schema.tables t
    WHERE table_schema = 'public'
),
functions AS (
    SELECT 
        routine_name,
        routine_definition,
        (
            SELECT json_agg(parameter_name || ' ' || data_type)
            FROM information_schema.parameters p
            WHERE p.specific_name = r.specific_name
        ) as args
    FROM information_schema.routines r
    WHERE routine_schema = 'public'
)
SELECT json_build_object(
    'tables', (SELECT json_agg(row_to_json(t)) FROM tables t),
    'functions', (SELECT json_agg(row_to_json(f)) FROM functions f)
);
