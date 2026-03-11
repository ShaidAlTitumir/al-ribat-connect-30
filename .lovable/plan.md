

## Plan: Fix Partner Equity & Negative Total Business Value

### Problem 1: Partner Equity Shows 0
**Root cause**: Equity (line 139-151 of `Index.tsx`) is calculated solely from `capital_contributions`. When partners add products to inventory but haven't recorded capital contributions, `totalCap = 0`, so all percentages = 0%.

**Fix**: When total capital contributions = 0, fall back to equal equity split among accepted partners. This reflects that if nobody has formally tracked capital, ownership is assumed equal. The profit share will also split equally.

```typescript
// In fetchDashboard, after computing totalCap:
const equalSplit = totalCap === 0 && partnersList.length > 0;
const partnerEquities = partnersList.map((p) => {
  const invested = partnerCapMap[p.id] || 0;
  const pct = equalSplit 
    ? 100 / partnersList.length 
    : (totalCap > 0 ? (invested / totalCap) * 100 : 0);
  return { name: p.name, role: p.role, totalBdt: invested, percentage: pct, 
           profitShare: netProfit > 0 ? (pct / 100) * netProfit : 0 };
});
```

### Problem 2: Minus Sign on Total Business Value
**Root cause**: The `fmt` function (`"৳" + Math.round(n).toLocaleString()`) doesn't handle negatives gracefully, producing `৳-1,234`.

**Fix**: Update `fmt` to show `-৳1,234` format for negative values:
```typescript
const fmt = (n: number) => {
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? "-" : "") + "৳" + abs.toLocaleString("en-IN");
};
```

### Files Changed
- `src/pages/Index.tsx` — both fixes in this single file

