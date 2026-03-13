
-- Add paid column to purchase_transactions
ALTER TABLE public.purchase_transactions ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT true;

-- Create get_business_valuation function
CREATE OR REPLACE FUNCTION public.get_business_valuation(p_business_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cash numeric;
  v_inventory_value numeric;
  v_dues_receivable numeric;
  v_payables numeric;
  v_total_assets numeric;
  v_total_liabilities numeric;
  v_business_value numeric;
  v_total_received numeric;
  v_total_purchase_costs numeric;
  v_total_expenses numeric;
BEGIN
  -- Cash = total received (sales received + due payments) - total purchase costs (paid only) - total expenses
  SELECT COALESCE(SUM(received_now_bdt), 0) INTO v_total_received
  FROM public.sales WHERE business_id = p_business_id;

  -- Add customer ledger payments
  v_total_received := v_total_received + COALESCE(
    (SELECT SUM(amount) FROM public.customer_ledger 
     WHERE business_id = p_business_id AND transaction_type = 'payment'), 0);

  -- Total purchase costs (only paid purchases affect cash)
  SELECT COALESCE(SUM(total_landed_cost_bdt), 0) INTO v_total_purchase_costs
  FROM public.purchase_transactions 
  WHERE business_id = p_business_id AND paid = true;

  -- Total expenses
  SELECT COALESCE(SUM(CASE WHEN currency = 'BDT' THEN amount ELSE amount * 
    (SELECT exchange_rate FROM public.businesses WHERE id = p_business_id) END), 0)
  INTO v_total_expenses
  FROM public.expenses WHERE business_id = p_business_id;

  v_cash := v_total_received - v_total_purchase_costs - v_total_expenses;

  -- Inventory value at cost (current_stock * latest landed_cost_per_unit)
  SELECT COALESCE(SUM(
    ii.current_stock * COALESCE(
      (SELECT pt.landed_cost_per_unit_bdt 
       FROM public.purchase_transactions pt 
       WHERE pt.item_id = ii.id AND pt.business_id = p_business_id
       ORDER BY pt.created_at DESC LIMIT 1), 0)
  ), 0) INTO v_inventory_value
  FROM public.inventory_items ii WHERE ii.business_id = p_business_id;

  -- Dues receivable from sales
  SELECT COALESCE(SUM(due), 0) INTO v_dues_receivable
  FROM public.sales WHERE business_id = p_business_id;

  -- Payables = unpaid purchase costs
  SELECT COALESCE(SUM(total_landed_cost_bdt), 0) INTO v_payables
  FROM public.purchase_transactions 
  WHERE business_id = p_business_id AND paid = false;

  v_total_assets := v_cash + v_inventory_value + v_dues_receivable;
  v_total_liabilities := v_payables;
  v_business_value := v_total_assets - v_total_liabilities;

  RETURN json_build_object(
    'cash', v_cash,
    'inventory_value', v_inventory_value,
    'dues_receivable', v_dues_receivable,
    'payables', v_payables,
    'total_assets', v_total_assets,
    'total_liabilities', v_total_liabilities,
    'business_value', v_business_value
  );
END;
$$;
