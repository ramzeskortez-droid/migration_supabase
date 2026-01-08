-- FIX RLS (Row Level Security) для новой схемы
-- Проблема: После удаления owner_token старые политики могли сломаться.
-- Решение: Открываем доступ на чтение (фильтрация идет на уровне приложения), 
-- так как используется кастомная авторизация через app_users, а не Supabase Auth.

-- 1. ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON public.orders;
CREATE POLICY "Public read access" ON public.orders FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public insert access" ON public.orders;
CREATE POLICY "Public insert access" ON public.orders FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access" ON public.orders;
CREATE POLICY "Public update access" ON public.orders FOR UPDATE TO public USING (true);

-- 2. ORDER_ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON public.order_items;
CREATE POLICY "Public read access" ON public.order_items FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public insert access" ON public.order_items;
CREATE POLICY "Public insert access" ON public.order_items FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access" ON public.order_items;
CREATE POLICY "Public update access" ON public.order_items FOR UPDATE TO public USING (true);

-- 3. OFFERS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON public.offers;
CREATE POLICY "Public read access" ON public.offers FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public insert access" ON public.offers;
CREATE POLICY "Public insert access" ON public.offers FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access" ON public.offers;
CREATE POLICY "Public update access" ON public.offers FOR UPDATE TO public USING (true);

-- 4. OFFER_ITEMS
ALTER TABLE public.offer_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON public.offer_items;
CREATE POLICY "Public read access" ON public.offer_items FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public insert access" ON public.offer_items;
CREATE POLICY "Public insert access" ON public.offer_items FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access" ON public.offer_items;
CREATE POLICY "Public update access" ON public.offer_items FOR UPDATE TO public USING (true);

-- 5. APP_USERS (Важно для логина)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON public.app_users;
CREATE POLICY "Public read access" ON public.app_users FOR SELECT TO public USING (true);
