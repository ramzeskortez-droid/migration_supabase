-- ПОЛНЫЙ СПИСОК ТАБЛИЦ И ИХ СТРУКТУРА
SELECT 
    cols.table_name AS "Таблица",
    cols.column_name AS "Колонка",
    cols.data_type AS "Тип данных",
    cols.is_nullable AS "Обязательно (No=Да)",
    cols.column_default AS "По умолчанию",
    (
        SELECT 'PK' 
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
        WHERE kcu.table_name = cols.table_name 
          AND kcu.column_name = cols.column_name 
          AND tc.constraint_type = 'PRIMARY KEY'
    ) AS "Ключ"
FROM 
    information_schema.columns cols
WHERE 
    cols.table_schema = 'public'
ORDER BY 
    cols.table_name, cols.ordinal_position;
