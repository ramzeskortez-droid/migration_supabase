ALTER TABLE public.offer_items 
ADD COLUMN IF NOT EXISTS comment TEXT,
ADD COLUMN IF NOT EXISTS admin_comment TEXT;
