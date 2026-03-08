
-- Create returns table
CREATE TABLE public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid REFERENCES auth.users(id),
  sale_id uuid REFERENCES public.sales(id),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id),
  customer_id uuid REFERENCES public.customers(id),
  quantity integer NOT NULL,
  refund_amount numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'completed'
);

-- Enable RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "returns_select" ON public.returns FOR SELECT TO authenticated
  USING (user_can_access_business(business_id));

CREATE POLICY "returns_insert" ON public.returns FOR INSERT TO authenticated
  WITH CHECK (user_can_access_business(business_id));

CREATE POLICY "returns_delete" ON public.returns FOR DELETE TO authenticated
  USING (user_can_access_business(business_id));
