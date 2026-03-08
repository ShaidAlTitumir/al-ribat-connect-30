
-- Create a security definer function to check if user can access a business
CREATE OR REPLACE FUNCTION public.user_can_access_business(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND business_id = _business_id
  )
  OR EXISTS (
    SELECT 1 FROM public.business_members WHERE user_id = auth.uid() AND business_id = _business_id
  )
$$;

-- Drop and recreate all RLS policies to use the new function

-- activity_log
DROP POLICY IF EXISTS "al_select" ON public.activity_log;
DROP POLICY IF EXISTS "al_insert" ON public.activity_log;
CREATE POLICY "al_select" ON public.activity_log FOR SELECT TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "al_insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));

-- capital_contributions
DROP POLICY IF EXISTS "cc_select" ON public.capital_contributions;
DROP POLICY IF EXISTS "cc_insert" ON public.capital_contributions;
DROP POLICY IF EXISTS "cc_update" ON public.capital_contributions;
DROP POLICY IF EXISTS "cc_delete" ON public.capital_contributions;
CREATE POLICY "cc_select" ON public.capital_contributions FOR SELECT TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "cc_insert" ON public.capital_contributions FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));
CREATE POLICY "cc_update" ON public.capital_contributions FOR UPDATE TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "cc_delete" ON public.capital_contributions FOR DELETE TO authenticated USING (user_can_access_business(business_id));

-- customer_ledger
DROP POLICY IF EXISTS "cl_select" ON public.customer_ledger;
DROP POLICY IF EXISTS "cl_insert" ON public.customer_ledger;
CREATE POLICY "cl_select" ON public.customer_ledger FOR SELECT TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "cl_insert" ON public.customer_ledger FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));

-- customers
DROP POLICY IF EXISTS "cust_select" ON public.customers;
DROP POLICY IF EXISTS "cust_insert" ON public.customers;
DROP POLICY IF EXISTS "cust_update" ON public.customers;
DROP POLICY IF EXISTS "cust_delete" ON public.customers;
CREATE POLICY "cust_select" ON public.customers FOR SELECT TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "cust_insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));
CREATE POLICY "cust_update" ON public.customers FOR UPDATE TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "cust_delete" ON public.customers FOR DELETE TO authenticated USING (user_can_access_business(business_id));

-- exchanges
DROP POLICY IF EXISTS "ex_select" ON public.exchanges;
DROP POLICY IF EXISTS "ex_insert" ON public.exchanges;
CREATE POLICY "ex_select" ON public.exchanges FOR SELECT TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "ex_insert" ON public.exchanges FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));

-- expenses
DROP POLICY IF EXISTS "exp_select" ON public.expenses;
DROP POLICY IF EXISTS "exp_insert" ON public.expenses;
DROP POLICY IF EXISTS "exp_delete" ON public.expenses;
CREATE POLICY "exp_select" ON public.expenses FOR SELECT TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "exp_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));
CREATE POLICY "exp_delete" ON public.expenses FOR DELETE TO authenticated USING (user_can_access_business(business_id));

-- inventory_items
DROP POLICY IF EXISTS "inv_select" ON public.inventory_items;
DROP POLICY IF EXISTS "inv_insert" ON public.inventory_items;
DROP POLICY IF EXISTS "inv_update" ON public.inventory_items;
DROP POLICY IF EXISTS "inv_delete" ON public.inventory_items;
CREATE POLICY "inv_select" ON public.inventory_items FOR SELECT TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "inv_insert" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));
CREATE POLICY "inv_update" ON public.inventory_items FOR UPDATE TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "inv_delete" ON public.inventory_items FOR DELETE TO authenticated USING (user_can_access_business(business_id));

-- partners
DROP POLICY IF EXISTS "Partners select by business" ON public.partners;
DROP POLICY IF EXISTS "Partners insert by business" ON public.partners;
DROP POLICY IF EXISTS "Partners update by business" ON public.partners;
DROP POLICY IF EXISTS "Partners delete by business" ON public.partners;
CREATE POLICY "Partners select by business" ON public.partners FOR SELECT TO authenticated USING (user_can_access_business(business_id) OR (status = 'pending' AND business_id IS NOT NULL));
CREATE POLICY "Partners insert by business" ON public.partners FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));
CREATE POLICY "Partners update by business" ON public.partners FOR UPDATE TO authenticated USING (user_can_access_business(business_id) OR status = 'pending');
CREATE POLICY "Partners delete by business" ON public.partners FOR DELETE TO authenticated USING (user_can_access_business(business_id));

-- purchase_transactions
DROP POLICY IF EXISTS "pt_select" ON public.purchase_transactions;
DROP POLICY IF EXISTS "pt_insert" ON public.purchase_transactions;
CREATE POLICY "pt_select" ON public.purchase_transactions FOR SELECT TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "pt_insert" ON public.purchase_transactions FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));

-- sales
DROP POLICY IF EXISTS "sales_select" ON public.sales;
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
DROP POLICY IF EXISTS "sales_update" ON public.sales;
DROP POLICY IF EXISTS "sales_delete" ON public.sales;
CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));
CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated USING (user_can_access_business(business_id));
CREATE POLICY "sales_delete" ON public.sales FOR DELETE TO authenticated USING (user_can_access_business(business_id));

-- notifications (uses user_id, keep as-is but add business access for insert)
DROP POLICY IF EXISTS "Business members can insert notifications" ON public.notifications;
CREATE POLICY "Business members can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_can_access_business(business_id));
