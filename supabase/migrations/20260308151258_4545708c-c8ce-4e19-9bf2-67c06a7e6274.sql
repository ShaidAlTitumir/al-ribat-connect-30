UPDATE sales s
SET expected_profit = (s.unit_price_bdt - COALESCE(
  (SELECT pt.landed_cost_per_unit_bdt 
   FROM purchase_transactions pt 
   WHERE pt.item_id = s.item_id AND pt.created_at <= s.created_at
   ORDER BY pt.created_at DESC LIMIT 1), 
  0
)) * s.quantity;