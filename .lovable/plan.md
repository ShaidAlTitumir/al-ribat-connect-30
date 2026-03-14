

## Plan: Clarify Business Value as Total Assets - Total Liabilities

### What Changes

The current formula (`Net Profit + Inventory + Dues - Payables`) is mathematically correct but uses confusing labels. The user wants a clear **Assets vs Liabilities** framing.

#### 1. Update Equity Breakdown Strip (`src/pages/Index.tsx`)
- Restructure the breakdown to show two groups:
  - **Assets**: Cash (net profit) + Inventory (at cost) + Receivables (dues)
  - **Liabilities**: Payables (unpaid purchases)
- Display as: `Assets (Cash + Inventory + Dues) - Liabilities (Payables) = Business Value`

#### 2. Update Hero Card Label
- Keep "Total Business Value" as the primary metric
- Add a subtitle: "Total Assets − Total Liabilities"

#### 3. Update KPI Grid
- Rename "Net Profit" → "Cash (Net)" to clarify it represents liquid cash position
- Group KPIs visually: asset cards first, then liability cards

#### 4. Update RPC Function (`get_business_valuation`)
- No formula changes needed — the math is already correct
- The RPC already computes `total_assets`, `total_liabilities`, and `business_value`

### Files Modified
- `src/pages/Index.tsx` — label and layout changes only

