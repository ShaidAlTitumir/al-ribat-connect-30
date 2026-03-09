
-- Create a security definer function to look up a business by join_code
-- This bypasses RLS so non-members can find the business to request joining
CREATE OR REPLACE FUNCTION public.lookup_business_by_join_code(_join_code text)
RETURNS TABLE(id uuid, name text, owner_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.name, b.owner_id
  FROM public.businesses b
  WHERE b.join_code = _join_code
  LIMIT 1;
$$;
