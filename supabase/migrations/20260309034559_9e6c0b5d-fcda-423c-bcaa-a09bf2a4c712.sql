
-- Remove duplicate partners keeping only the earliest one per (business_id, user_id)
DELETE FROM public.partners a
USING public.partners b
WHERE a.business_id = b.business_id
  AND a.user_id = b.user_id
  AND a.user_id IS NOT NULL
  AND a.created_at > b.created_at;

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX unique_partner_per_business ON public.partners (business_id, user_id) WHERE user_id IS NOT NULL;
