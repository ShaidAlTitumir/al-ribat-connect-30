import { ArrowRightLeft } from "lucide-react";

const CurrencyWidget = () => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-sm font-bold text-foreground mb-4">Exchange Rate</h3>
      <div className="flex items-center gap-4">
        <div className="flex-1 rounded-lg bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">BDT</p>
          <p className="text-lg font-extrabold text-foreground">৳15.60</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ArrowRightLeft className="h-4 w-4" />
        </div>
        <div className="flex-1 rounded-lg bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">RMB</p>
          <p className="text-lg font-extrabold text-foreground">¥1.00</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 text-center">
        Last updated: March 8, 2026
      </p>
    </div>
  );
};

export default CurrencyWidget;
