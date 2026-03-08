
-- Partner leave requests table
CREATE TABLE public.partner_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plr_select" ON public.partner_leave_requests FOR SELECT TO authenticated
  USING (user_can_access_business(business_id));
CREATE POLICY "plr_insert" ON public.partner_leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_can_access_business(business_id));
CREATE POLICY "plr_update" ON public.partner_leave_requests FOR UPDATE TO authenticated
  USING (user_can_access_business(business_id));
CREATE POLICY "plr_delete" ON public.partner_leave_requests FOR DELETE TO authenticated
  USING (user_can_access_business(business_id));

-- Partner leave votes table
CREATE TABLE public.partner_leave_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.partner_leave_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote text NOT NULL DEFAULT 'pending',
  voted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_leave_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plv_select" ON public.partner_leave_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_leave_requests lr
    WHERE lr.id = partner_leave_votes.request_id AND user_can_access_business(lr.business_id)
  ));
CREATE POLICY "plv_insert" ON public.partner_leave_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "plv_update" ON public.partner_leave_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
