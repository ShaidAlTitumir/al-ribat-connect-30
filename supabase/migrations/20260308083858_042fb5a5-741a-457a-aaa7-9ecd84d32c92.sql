
DROP POLICY "Users can create businesses" ON public.businesses;
CREATE POLICY "Users can create businesses"
  ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
