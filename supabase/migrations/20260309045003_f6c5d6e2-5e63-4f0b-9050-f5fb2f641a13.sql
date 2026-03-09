
-- Drop the two restrictive SELECT policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can search profiles by username" ON public.profiles;

-- Recreate as PERMISSIVE (default) so either condition grants access
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can search profiles by username"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (username IS NOT NULL);
