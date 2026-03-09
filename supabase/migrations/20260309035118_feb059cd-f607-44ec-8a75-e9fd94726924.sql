
-- Create a security definer function to handle the entire join request flow
-- This bypasses RLS so non-members can create join requests and notify the owner
CREATE OR REPLACE FUNCTION public.create_join_request(_join_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _business_id uuid;
  _business_name text;
  _owner_id uuid;
  _user_name text;
  _existing_member uuid;
  _pending_request uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  -- Look up business
  SELECT id, name, owner_id INTO _business_id, _business_name, _owner_id
  FROM public.businesses WHERE join_code = _join_code LIMIT 1;

  IF _business_id IS NULL THEN
    RETURN json_build_object('error', 'Invalid join code');
  END IF;

  -- Check if already a member via profiles
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND business_id = _business_id) THEN
    RETURN json_build_object('error', 'You are already a member of this business');
  END IF;

  -- Check if already a member via business_members
  IF EXISTS (SELECT 1 FROM public.business_members WHERE user_id = _user_id AND business_id = _business_id) THEN
    RETURN json_build_object('error', 'You are already a member of this business');
  END IF;

  -- Check for pending request
  IF EXISTS (SELECT 1 FROM public.join_requests WHERE user_id = _user_id AND business_id = _business_id AND status = 'pending') THEN
    RETURN json_build_object('error', 'You already have a pending join request for this business');
  END IF;

  -- Create join request
  INSERT INTO public.join_requests (user_id, business_id) VALUES (_user_id, _business_id);

  -- Get user name
  SELECT full_name INTO _user_name FROM public.profiles WHERE user_id = _user_id LIMIT 1;

  -- Notify business owner
  IF _owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, business_id, title, message, type)
    VALUES (
      _owner_id,
      _business_id,
      'New Join Request',
      COALESCE(_user_name, 'Someone') || ' wants to join "' || _business_name || '". Tap to approve or reject.',
      'join_request'
    );
  END IF;

  RETURN json_build_object('success', true, 'business_name', _business_name);
END;
$$;
