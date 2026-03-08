
-- Table to track deletion requests that need partner approval
CREATE TABLE public.business_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, status)
);

-- Track each partner's approval/rejection
CREATE TABLE public.business_deletion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.business_deletion_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote text NOT NULL DEFAULT 'pending',
  voted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(request_id, user_id)
);

ALTER TABLE public.business_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_deletion_votes ENABLE ROW LEVEL SECURITY;

-- RLS for deletion_requests
CREATE POLICY "dr_select" ON public.business_deletion_requests FOR SELECT TO authenticated
  USING (user_can_access_business(business_id));
CREATE POLICY "dr_insert" ON public.business_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (user_can_access_business(business_id));
CREATE POLICY "dr_update" ON public.business_deletion_requests FOR UPDATE TO authenticated
  USING (user_can_access_business(business_id));
CREATE POLICY "dr_delete" ON public.business_deletion_requests FOR DELETE TO authenticated
  USING (user_can_access_business(business_id));

-- RLS for deletion_votes
CREATE POLICY "dv_select" ON public.business_deletion_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_deletion_requests dr
    WHERE dr.id = request_id AND user_can_access_business(dr.business_id)
  ));
CREATE POLICY "dv_insert" ON public.business_deletion_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "dv_update" ON public.business_deletion_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Allow business deletion by owner
CREATE POLICY "Users can delete owned businesses" ON public.businesses FOR DELETE TO authenticated
  USING (owner_id = auth.uid());
