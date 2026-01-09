-- Принудительное открытие доступа к брендам для отладки поиска
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all" ON public.brands;
CREATE POLICY "Enable read access for all" ON public.brands FOR SELECT USING (true);