import { useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";

interface ExchangeRateHeaderProps {
  title: string;
}

const ExchangeRateHeader = ({ title }: ExchangeRateHeaderProps) => {
  const { exchangeRate, setExchangeRate, saveExchangeRate } = useBusiness();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveExchangeRate();
      toast.success("Exchange rate saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="h-14 lg:h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 px-4 lg:px-8 flex items-center justify-between transition-all duration-200">
      <h2 className="text-lg lg:text-xl font-bold text-foreground">{displayTitle}</h2>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1.5">
          <span className="material-symbols-outlined text-[16px] text-muted-foreground">currency_exchange</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">1 RMB =</span>
          <input
            type="number"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
            className="w-12 text-center text-sm font-bold bg-transparent border-none outline-none text-foreground"
            step="0.5"
          />
          <span className="text-xs text-muted-foreground">BDT</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-all duration-200 active:scale-95 disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
      </div>
    </header>
  );
};

export default ExchangeRateHeader;
