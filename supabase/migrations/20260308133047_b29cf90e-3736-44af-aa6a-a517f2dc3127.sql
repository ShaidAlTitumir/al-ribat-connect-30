
CREATE TABLE public.sample_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid,
  type text NOT NULL DEFAULT 'buy',
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  cost_rmb numeric NOT NULL DEFAULT 0,
  customer_name text,
  supplier_name text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sample_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "so_select" ON public.sample_orders FOR SELECT TO authenticated
  USING (user_can_access_business(business_id));
CREATE POLICY "so_insert" ON public.sample_orders FOR INSERT TO authenticated
  WITH CHECK (user_can_access_business(business_id));
CREATE POLICY "so_update" ON public.sample_orders FOR UPDATE TO authenticated
  USING (user_can_access_business(business_id));
CREATE POLICY "so_delete" ON public.sample_orders FOR DELETE TO authenticated
  USING (user_can_access_business(business_id));
