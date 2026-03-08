import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import { useMobileHeader } from "@/layouts/AppLayout";

interface ExchangeRateHeaderProps {
  title: string;
}

const MobilePageHeader = ({ title, exchangeRate, onRateClick, isSolo }: { title: string; exchangeRate: number; onRateClick: () => void; isSolo: boolean }) => {
  return (
    <div className="flex items-center justify-between h-11 px-4">
      <h2 className="text-sm font-bold text-foreground truncate">{title}</h2>
      {!isSolo && (
        <button
          onClick={onRateClick}
          className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1.5 text-xs font-bold text-foreground"
        >
          <span className="material-symbols-outlined text-[14px] text-muted-foreground">currency_exchange</span>
          ¥1 = ৳{exchangeRate.toFixed(2)}
        </button>
      )}
    </div>
  );
};

const ExchangeRateHeader = ({ title }: ExchangeRateHeaderProps) => {
  const { exchangeRate, setExchangeRate, saveExchangeRate, isSolo } = useBusiness();
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
      <MobilePageHeader title={title} exchangeRate={exchangeRate} onRateClick={handleRateClick} isSolo={isSolo} />
    );
    return () => setPageHeader(null);
  }, [title, exchangeRate, setPageHeader, handleRateClick, isSolo]);

  return (
    <>
      {/* Desktop header */}
      <header className="hidden lg:flex h-14 border-b border-border bg-card sticky top-0 z-10 px-8 items-center justify-between">
        <h2 className="text-lg font-bold text-foreground truncate">{title}</h2>
        <div className="flex items-center gap-2">
          <NotificationBell />
          {!isSolo && (
          <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5">
            <span className="material-symbols-outlined text-[16px] text-muted-foreground">currency_exchange</span>
            <span className="text-xs text-muted-foreground">1¥ =</span>
            <input
              type="number"
              value={exchangeRate.toFixed(2)}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
              className="w-14 text-center text-sm font-bold bg-transparent border-none outline-none text-foreground"
              step="0.01"
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
          )}
        </div>
      </header>

      {/* Mobile rate dropdown */}
      {rateOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRateOpen(false)} />
          <div className="relative w-full sm:w-80 bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 pb-8 sm:pb-5 animate-in slide-in-from-bottom-4 duration-200">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4 sm:hidden" />
            <p className="text-sm font-semibold text-foreground mb-3">Exchange Rate</p>
            <div className="flex items-center gap-3 bg-muted rounded-xl p-3">
              <span className="text-sm font-medium text-muted-foreground">1¥ =</span>
              <input
                type="number"
                value={exchangeRate.toFixed(2)}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                className="flex-1 text-center text-lg font-bold bg-card border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
                step="0.01"
                autoFocus
              />
              <span className="text-sm font-medium text-muted-foreground">৳</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-4 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
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
