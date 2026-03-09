

## Plan: Block removed partner's business access

**Goal**: When a partner is removed from a business, instead of creating a new "My Business" for them, set their `business_id` to `null` so they land on the "No Business" screen. They can then create a new business or join another one.

### Current behavior
When a removal is approved, the `add_partner_to_business` RPC is called with `_business_id = null`, which:
1. Creates a new "My Business" for the removed partner
2. Updates their profile to point to that new business
3. Removes them from `business_members`

### What needs to change

**1. Modify the `add_partner_to_business` database function**

Update the RPC so that when `_business_id IS NULL`, it simply sets the user's `business_id` to `null` and removes them from `business_members` -- without creating a new business.

```sql
-- When _business_id IS NULL:
-- Instead of creating a new business, just clear their profile
UPDATE public.profiles
SET business_id = NULL, role = 'admin'
WHERE user_id = _target_user_id;

-- Remove from business_members for old business
DELETE FROM public.business_members 
WHERE user_id = _target_user_id AND business_id = old_business_id;
```

**2. No frontend changes needed**

The `NoBusinessGuard` component already handles the case where `businessId` is `null` -- it shows a "No Business Yet" screen with options to create or join a business. So once the RPC stops auto-creating a business, the removed partner will automatically see this screen.

### Summary
- One database migration to update the `add_partner_to_business` function
- No frontend code changes required
- The existing `NoBusinessGuard` component handles the UX naturally

