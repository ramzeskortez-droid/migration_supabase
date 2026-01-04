ALTER TABLE public.offer_items ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.offer_items ADD COLUMN IF NOT EXISTS admin_comment TEXT;
