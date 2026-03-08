import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import { useMobileHeader } from "@/layouts/AppLayout";

interface ExchangeRateHeaderProps {
  title: string;
}

const MobilePageHeader = ({ title, exchangeRate, onRateClick }: { title: string; exchangeRate: number; onRateClick: () => void }) => {
  return (
    <div className="flex items-center justify-between h-11 px-4">
      <h2 className="text-sm font-bold text-foreground truncate">{title}</h2>
      <div className="flex items-center gap-1.5">
        <NotificationBell />
        <button
          onClick={onRateClick}
          className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1.5 text-xs font-bold text-foreground"
        >
          <span className="material-symbols-outlined text-[14px] text-muted-foreground">currency_exchange</span>
          ¥1 = ৳{exchangeRate}
        </button>
      </div>
    </div>
  );
};

const ExchangeRateHeader = ({ title }: ExchangeRateHeaderProps) => {
  const { exchangeRate, setExchangeRate, saveExchangeRate } = useBusiness();
  const [saving, setSaving] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const { setPageHeader } = useMobileHeader();

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveExchangeRate();
      toast.success("Exchange rate saved");
      setRateOpen(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRateClick = useCallback(() => {
    setRateOpen(prev => !prev);
  }, []);

  useEffect(() => {
    setPageHeader(
      <MobilePageHeader title={title} exchangeRate={exchangeRate} onRateClick={handleRateClick} />
    );
    return () => setPageHeader(null);
  }, [title, exchangeRate, setPageHeader, handleRateClick]);

  return (
    <>
      {/* Desktop header */}
      <header className="hidden lg:flex h-14 border-b border-border bg-card sticky top-0 z-10 px-8 items-center justify-between">
        <h2 className="text-lg font-bold text-foreground truncate">{title}</h2>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5">
            <span className="material-symbols-outlined text-[16px] text-muted-foreground">currency_exchange</span>
            <span className="text-xs text-muted-foreground">1¥ =</span>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
              className="w-12 text-center text-sm font-bold bg-transparent border-none outline-none text-foreground"
              step="0.5"
            />
            <span className="text-xs text-muted-foreground">৳</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-1 px-2 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-md hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? "..." : "Save"}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile rate dropdown */}
      {rateOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0" onClick={() => setRateOpen(false)} />
          <div className="absolute top-[6.5rem] right-4 bg-card border border-border rounded-xl shadow-xl p-3 w-52 animate-fade-in">
            <p className="text-xs font-medium text-muted-foreground mb-2">Exchange Rate</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">1¥ =</span>
              <input
                type="number"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                className="flex-1 text-center text-sm font-bold bg-muted border border-border rounded-lg px-2 py-1.5 outline-none text-foreground"
                step="0.5"
              />
              <span className="text-xs text-muted-foreground">৳</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Rate"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ExchangeRateHeader;
