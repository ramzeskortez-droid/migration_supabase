ALTER TABLE offer_items ADD COLUMN client_delivery_weeks INTEGER;
COMMENT ON COLUMN offer_items.client_delivery_weeks IS 'Зафиксированный срок поставки для клиента (в неделях)';