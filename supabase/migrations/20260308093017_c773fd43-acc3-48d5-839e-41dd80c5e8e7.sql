
-- Add unique constraint on business_members(user_id, business_id) if not exists
ALTER TABLE public.business_members ADD CONSTRAINT business_members_user_business_unique UNIQUE (user_id, business_id);

-- Backfill: insert business_members for accepted partners who don't have entries yet
INSERT INTO public.business_members (user_id, business_id, role)
SELECT p.user_id, p.business_id, p.role
FROM public.partners p
WHERE p.user_id IS NOT NULL
  AND p.business_id IS NOT NULL
  AND p.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.user_id = p.user_id AND bm.business_id = p.business_id
  );
