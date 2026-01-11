ALTER TABLE orders RENAME COLUMN status_admin TO status_manager;
ALTER TABLE orders ADD COLUMN is_manual_processing BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN orders.is_manual_processing IS 'Флаг ручной обработки оператором';