
DROP POLICY "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Business members can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()));
