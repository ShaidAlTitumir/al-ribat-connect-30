CREATE TABLE public.partner_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  to_partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  method TEXT NOT NULL DEFAULT 'bank',
  transaction_id TEXT,
  notes TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_select" ON public.partner_transfers FOR SELECT TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "pt_insert" ON public.partner_transfers FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));
CREATE POLICY "pt_update" ON public.partner_transfers FOR UPDATE TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "pt_delete" ON public.partner_transfers FOR DELETE TO authenticated USING (user_can_access_business(business_id));