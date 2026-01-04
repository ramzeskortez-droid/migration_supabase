ALTER TABLE public.offer_items 
ADD COLUMN IF NOT EXISTS comment TEXT,
ADD COLUMN IF NOT EXISTS admin_comment TEXT;

-- Refresh the schema cache if necessary (though usually automatic)
NOTIFY pgrst, 'reload schema';
