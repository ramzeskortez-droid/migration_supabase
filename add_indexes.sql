-- Indexes for the 'orders' table
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_client_phone ON public.orders(client_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status_admin ON public.orders(status_admin);
CREATE INDEX IF NOT EXISTS idx_orders_vin ON public.orders(vin);
CREATE INDEX IF NOT EXISTS idx_orders_client_name ON public.orders(client_name);
CREATE INDEX IF NOT EXISTS idx_orders_car_model ON public.orders(car_model);
CREATE INDEX IF NOT EXISTS idx_orders_car_brand ON public.orders(car_brand);

-- Indexes for the 'offers' table
CREATE INDEX IF NOT EXISTS idx_offers_order_id ON public.offers(order_id);

-- Indexes for the 'offer_items' table
CREATE INDEX IF NOT EXISTS idx_offer_items_offer_id ON public.offer_items(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_items_order_item_id ON public.offer_items(order_item_id);
