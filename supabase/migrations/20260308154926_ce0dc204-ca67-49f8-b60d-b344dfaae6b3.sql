
CREATE OR REPLACE FUNCTION public.add_partner_to_business(_target_user_id uuid, _business_id uuid, _role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  new_business_id uuid;
BEGIN
  -- Allow if caller belongs to the business OR business_id is null (removing)
  IF _business_id IS NOT NULL AND get_user_business_id(auth.uid()) != _business_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  IF _business_id IS NULL THEN
    -- Partner is being removed: create a fresh business for them
    INSERT INTO public.businesses (name, owner_id) VALUES ('My Business', _target_user_id) RETURNING id INTO new_business_id;
    
    UPDATE public.profiles
    SET business_id = new_business_id, role = 'admin'
    WHERE user_id = _target_user_id;
    
    -- Also remove from business_members for the old business
    DELETE FROM public.business_members WHERE user_id = _target_user_id AND business_id = get_user_business_id(_target_user_id);
  ELSE
    UPDATE public.profiles
    SET business_id = _business_id, role = _role
    WHERE user_id = _target_user_id;
  END IF;
END;
$$;
