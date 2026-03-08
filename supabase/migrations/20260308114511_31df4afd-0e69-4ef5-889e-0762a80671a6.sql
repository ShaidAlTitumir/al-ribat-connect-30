-- Add missing UPDATE and DELETE policies for tables that need edit/delete

-- expenses: needs UPDATE policy
CREATE POLICY "exp_update" ON public.expenses FOR UPDATE TO authenticated
USING (user_can_access_business(business_id));

-- returns: needs UPDATE policy  
CREATE POLICY "returns_update" ON public.returns FOR UPDATE TO authenticated
USING (user_can_access_business(business_id));

-- purchase_transactions: needs UPDATE and DELETE policies
CREATE POLICY "pt_update_purchases" ON public.purchase_transactions FOR UPDATE TO authenticated
USING (user_can_access_business(business_id));

CREATE POLICY "pt_delete_purchases" ON public.purchase_transactions FOR DELETE TO authenticated
USING (user_can_access_business(business_id));

-- exchanges: needs UPDATE and DELETE policies
CREATE POLICY "ex_update" ON public.exchanges FOR UPDATE TO authenticated
USING (user_can_access_business(business_id));

CREATE POLICY "ex_delete" ON public.exchanges FOR DELETE TO authenticated
USING (user_can_access_business(business_id));

-- customer_ledger: needs UPDATE and DELETE policies
CREATE POLICY "cl_update" ON public.customer_ledger FOR UPDATE TO authenticated
USING (user_can_access_business(business_id));

CREATE POLICY "cl_delete" ON public.customer_ledger FOR DELETE TO authenticated
USING (user_can_access_business(business_id));