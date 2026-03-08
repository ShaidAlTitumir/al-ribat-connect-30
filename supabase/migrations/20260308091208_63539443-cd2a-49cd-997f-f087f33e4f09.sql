ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS shop_name text;