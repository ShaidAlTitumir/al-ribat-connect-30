

## Business Value Calculation Engine (Asset-Based / Equity Method)

### Problem
The current dashboard calculates Business Value as `Cash + Inventory + Dues` but has no concept of **liabilities** (unpaid supplier purchases). The formula should be `Total Assets - Total Liabilities`.

### Changes

#### 1. Database Migration
Add a `paid` boolean column to `purchase_transactions` to track whether supplier has been paid:
```sql
ALTER TABLE purchase_transactions ADD COLUMN paid boolean NOT NULL DEFAULT true;
```
Default `true` so existing records are unaffected. New purchases can be marked as unpaid to create a payable.

Create a `SECURITY DEFINER` database function `get_business_valuation(p_business_id uuid)` that returns a JSON object with all valuation components:
- **cash**: `sum(income inflows) - sum(expense outflows)` from sales, payments, expenses, purchases
- **inventory_value**: `sum(current_stock * landed_cost_per_unit)` from inventory + purchase_transactions
- **dues_receivable**: `sum(due)` from sales table
- **payables**: `sum(total_landed_cost_bdt)` from purchase_transactions where `paid = false`
- **total_assets**: cash + inventory + dues
- **total_liabilities**: payables
- **business_value**: total_assets - total_liabilities

This function ensures the dashboard is never out of sync — it always reads live data.

#### 2. Dashboard Logic (`src/pages/Index.tsx`)
- Call the new DB function via `supabase.rpc('get_business_valuation', { p_business_id: businessId })` instead of manually computing everything client-side
- Keep existing client-side calculations as fallback
- Add `payables` to KPI state
- Update `totalValueBdt = totalAssets - totalLiabilities`

#### 3. UI Changes (`src/pages/Index.tsx`)
- Add a **Value Breakdown** strip below the hero card showing:
  `Cash + Inventory + Dues - Payables = Business Value`
  Each component as a small labeled chip with its value
- Add "Payables" KPI card (red-accented) in the grid when payables > 0
- Cash Balance shown in red with minus sign when negative (already done)
- Break-even label already exists, will continue working with updated cash calculation

#### 4. Inventory Page Integration
- Update the purchase/add-product flow in `src/pages/Inventory.tsx` to include a "Paid?" toggle (defaults to yes)
- When toggled off, the purchase is recorded with `paid: false`, creating a liability

### Files Modified
- **Migration SQL**: Add `paid` column + `get_business_valuation` function
- `src/pages/Index.tsx`: Use RPC function, add breakdown UI, add payables KPI
- `src/pages/Inventory.tsx`: Add paid toggle on purchase form

