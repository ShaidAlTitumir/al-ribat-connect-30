
-- 1. Create businesses table
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Business',
  default_currency text NOT NULL DEFAULT 'BDT',
  exchange_rate numeric NOT NULL DEFAULT 16,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- 2. Add business_id and role to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id),
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

-- 3. Add columns to partners
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id),
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'working';

-- Drop old unique constraint on invitation_code if it exists, and make it conditional
-- ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_invitation_code_key;

-- 4. Capital contributions
CREATE TABLE public.capital_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  notes text,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.capital_contributions ENABLE ROW LEVEL SECURITY;

-- 5. Inventory items
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  weight_per_unit numeric NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  default_selling_price numeric DEFAULT 0,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- 6. Purchase transactions
CREATE TABLE public.purchase_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  buying_cost_per_unit_rmb numeric NOT NULL DEFAULT 0,
  shipping_method text NOT NULL DEFAULT 'sea',
  shipping_rate_bdt_per_kg numeric NOT NULL DEFAULT 0,
  additional_cost_bdt numeric NOT NULL DEFAULT 0,
  total_landed_cost_bdt numeric NOT NULL DEFAULT 0,
  landed_cost_per_unit_bdt numeric NOT NULL DEFAULT 0,
  exchange_rate_used numeric NOT NULL DEFAULT 16,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_transactions ENABLE ROW LEVEL SECURITY;

-- 7. Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  total_due numeric NOT NULL DEFAULT 0,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 8. Sales
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id),
  quantity integer NOT NULL,
  unit_price_bdt numeric NOT NULL,
  received_now_bdt numeric NOT NULL DEFAULT 0,
  due numeric NOT NULL DEFAULT 0,
  expected_profit numeric NOT NULL DEFAULT 0,
  customer_id uuid REFERENCES public.customers(id),
  cost_rate numeric NOT NULL DEFAULT 16,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 9. Customer ledger
CREATE TABLE public.customer_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  amount numeric NOT NULL,
  reference_id uuid,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;

-- 10. Exchanges
CREATE TABLE public.exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  amount_from numeric NOT NULL,
  amount_to numeric NOT NULL,
  rate numeric NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;

-- 11. Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BDT',
  category text,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 12. Activity log
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER function to get user's business_id (avoids RLS recursion)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Businesses: users can see their own business
CREATE POLICY "Users can view their business" ON public.businesses
  FOR SELECT TO authenticated
  USING (id = public.get_user_business_id(auth.uid()));

CREATE POLICY "Users can update their business" ON public.businesses
  FOR UPDATE TO authenticated
  USING (id = public.get_user_business_id(auth.uid()));

-- Update profiles policies to allow business_id context
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Partners: view/manage by business_id
DROP POLICY IF EXISTS "Users can view their own partner record" ON public.partners;
DROP POLICY IF EXISTS "Users can claim partner record" ON public.partners;

CREATE POLICY "Partners select by business" ON public.partners
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR (status = 'pending' AND business_id IS NOT NULL));

CREATE POLICY "Partners insert by business" ON public.partners
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

CREATE POLICY "Partners update by business" ON public.partners
  FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR (status = 'pending'));

CREATE POLICY "Partners delete by business" ON public.partners
  FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- Macro for business-scoped tables
-- capital_contributions
CREATE POLICY "cc_select" ON public.capital_contributions FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "cc_insert" ON public.capital_contributions FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "cc_update" ON public.capital_contributions FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "cc_delete" ON public.capital_contributions FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- inventory_items
CREATE POLICY "inv_select" ON public.inventory_items FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "inv_insert" ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "inv_update" ON public.inventory_items FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "inv_delete" ON public.inventory_items FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- purchase_transactions
CREATE POLICY "pt_select" ON public.purchase_transactions FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "pt_insert" ON public.purchase_transactions FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

-- customers
CREATE POLICY "cust_select" ON public.customers FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "cust_insert" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "cust_update" ON public.customers FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "cust_delete" ON public.customers FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- sales
CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "sales_update" ON public.sales FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "sales_delete" ON public.sales FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- customer_ledger
CREATE POLICY "cl_select" ON public.customer_ledger FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "cl_insert" ON public.customer_ledger FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

-- exchanges
CREATE POLICY "ex_select" ON public.exchanges FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "ex_insert" ON public.exchanges FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

-- expenses
CREATE POLICY "exp_select" ON public.expenses FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "exp_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "exp_delete" ON public.expenses FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- activity_log
CREATE POLICY "al_select" ON public.activity_log FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "al_insert" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

-- =============================================
-- Update handle_new_user to create a business for new users
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_business_id uuid;
BEGIN
  -- Create a new business for the user
  INSERT INTO public.businesses (name) VALUES ('My Business') RETURNING id INTO new_business_id;
  
  -- Create profile with business_id
  INSERT INTO public.profiles (user_id, full_name, phone, business_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    new_business_id,
    'admin'
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
