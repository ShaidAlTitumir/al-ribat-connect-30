
CREATE OR REPLACE FUNCTION public.add_partner_to_business(_target_user_id uuid, _business_id uuid, _role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_business_id uuid;
BEGIN
  IF _business_id IS NOT NULL AND get_user_business_id(auth.uid()) != _business_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  IF _business_id IS NULL THEN
    SELECT business_id INTO old_business_id FROM public.profiles WHERE user_id = _target_user_id;
    
    UPDATE public.profiles
    SET business_id = NULL, role = 'admin'
    WHERE user_id = _target_user_id;
    
    IF old_business_id IS NOT NULL THEN
      DELETE FROM public.business_members WHERE user_id = _target_user_id AND business_id = old_business_id;
    END IF;
  ELSE
    UPDATE public.profiles
    SET business_id = _business_id, role = _role
    WHERE user_id = _target_user_id;
  END IF;
END;
$function$;
