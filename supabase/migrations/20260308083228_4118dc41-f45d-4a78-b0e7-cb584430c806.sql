
CREATE OR REPLACE FUNCTION public.add_partner_to_business(
  _target_user_id UUID,
  _business_id UUID,
  _role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if caller belongs to the business OR business_id is null (removing)
  IF _business_id IS NOT NULL AND get_user_business_id(auth.uid()) != _business_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  UPDATE public.profiles
  SET business_id = _business_id, role = _role
  WHERE user_id = _target_user_id;
END;
$$;
