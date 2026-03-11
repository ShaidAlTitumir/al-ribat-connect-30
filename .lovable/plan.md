

## Fix: Total Business Value Shows Negative for Partnership Businesses

### Root Cause
`totalValueBdt` (line 120) is calculated purely from cash flows:
```
Capital In + Sales In - Expenses Out - Purchases Out
```

When partners add existing products without recording capital contributions, purchase costs are subtracted but nothing offsets them. Inventory sitting on shelves and customer dues owed are **not** counted as assets.

### Fix
**Total Business Value = Cash Balance + Inventory Value + Outstanding Dues**

This is standard business accounting — assets include cash, inventory, and receivables.

### Changes in `src/pages/Index.tsx`

1. **Move inventory cost calculation before `totalValueBdt`** — currently `inventoryCost` is computed at lines 122-129, after `totalValueBdt` is set at line 120. Reorder so inventory value is available first.

2. **Update the formula**:
```typescript
const totalValueBdt = bdt + rmb * exchangeRate + inventoryCost + totalDues;
```

3. **Move `totalDues` calculation before the formula** as well (currently at line 131).

### Reordered logic flow:
```
1. Compute cash flows (bdt, rmb)          — existing
2. Compute inventoryCost                   — move up
3. Compute totalDues                       — move up  
4. totalValueBdt = cash + inventory + dues — updated formula
5. Set KPIs                                — existing
```

This is a single-file change in `src/pages/Index.tsx`, reordering ~15 lines of existing code and updating one formula.

