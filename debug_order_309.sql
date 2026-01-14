SELECT 
    id, 
    order_id, 
    name, 
    quantity, 
    created_at 
FROM order_items 
WHERE order_id = 309 
ORDER BY id;

SELECT 
    event_object_schema as schema,
    event_object_table as table,
    trigger_name,
    action_statement,
    action_orientation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'order_items';