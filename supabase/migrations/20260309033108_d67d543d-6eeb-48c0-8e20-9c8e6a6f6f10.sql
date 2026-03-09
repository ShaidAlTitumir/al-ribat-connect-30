
CREATE TABLE public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid DEFAULT NULL,
  reviewed_at timestamp with time zone DEFAULT NULL,
  UNIQUE(user_id, business_id, status)
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Requester can insert
CREATE POLICY "jr_insert" ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Requester can see own requests
CREATE POLICY "jr_select_own" ON public.join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Business members can see requests for their business
CREATE POLICY "jr_select_business" ON public.join_requests FOR SELECT TO authenticated
  USING (user_can_access_business(business_id));

-- Business members can update (approve/reject)
CREATE POLICY "jr_update" ON public.join_requests FOR UPDATE TO authenticated
  USING (user_can_access_business(business_id));
