
-- Add new columns to businesses table
ALTER TABLE public.businesses 
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS manual_value NUMERIC,
  ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Create business_members table for multi-business support
CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Users can see businesses they belong to
CREATE POLICY "Members can view own memberships"
  ON public.business_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own memberships
CREATE POLICY "Users can create memberships"
  ON public.business_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own memberships
CREATE POLICY "Users can leave business"
  ON public.business_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Allow business creation by authenticated users
DROP POLICY IF EXISTS "Users can view their business" ON public.businesses;
CREATE POLICY "Users can view their businesses"
  ON public.businesses FOR SELECT TO authenticated
  USING (
    id = get_user_business_id(auth.uid())
    OR id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

-- Allow insert for creating new businesses
CREATE POLICY "Users can create businesses"
  ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update policy to include owner check
DROP POLICY IF EXISTS "Users can update their business" ON public.businesses;
CREATE POLICY "Users can update their businesses"
  ON public.businesses FOR UPDATE TO authenticated
  USING (
    id = get_user_business_id(auth.uid())
    OR owner_id = auth.uid()
  );
