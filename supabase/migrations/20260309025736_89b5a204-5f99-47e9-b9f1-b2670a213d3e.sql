
-- Update handle_new_user to create a default solo business
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_business_id uuid;
BEGIN
  -- Create a default solo business for the user
  INSERT INTO public.businesses (name, business_type, owner_id)
  VALUES ('My Business', 'solo', NEW.id)
  RETURNING id INTO new_business_id;
  
  -- Create profile linked to the solo business
  INSERT INTO public.profiles (user_id, full_name, phone, business_id, role, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    new_business_id,
    'admin',
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'username', '')), '')
  );
  RETURN NEW;
END;
$function$;
