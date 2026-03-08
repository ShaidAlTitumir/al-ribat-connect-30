import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format } from "date-fns";

const Wallet = () => {
  const { businessId, exchangeRate } = useBusiness();
  const { user } = useAuth();
  const [fromCurrency, setFromCurrency] = useState<"BDT" | "RMB">("BDT");
  const [fromAmount, setFromAmount] = useState("");
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [useManualRate, setUseManualRate] = useState(false);
  const [manualRate, setManualRate] = useState("");
  const [editingEx, setEditingEx] = useState<any>(null);
  const [editForm, setEditForm] = useState({ amount_from: 0, rate: 0 });

  // Balances from capital contributions + exchanges
  const [bdtBalance, setBdtBalance] = useState(0);
  const [rmbBalance, setRmbBalance] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    // Capital contributions
    const { data: caps } = await supabase.from("capital_contributions").select("amount, currency").eq("business_id", businessId!);
    let bdt = 0, rmb = 0;
    (caps || []).forEach((c) => {
      if (c.currency === "BDT") bdt += c.amount;
      else rmb += c.amount;
    });

    // Sales received
    const { data: sales } = await supabase.from("sales").select("received_now_bdt").eq("business_id", businessId!);
    (sales || []).forEach((s) => { bdt += s.received_now_bdt; });

    // Due collections
    const { data: payments } = await supabase.from("customer_ledger").select("amount").eq("business_id", businessId!).eq("transaction_type", "payment");
    (payments || []).forEach((p) => { bdt += p.amount; });

    // Expenses
    const { data: exps } = await supabase.from("expenses").select("amount, currency").eq("business_id", businessId!);
    (exps || []).forEach((e) => {
      if (e.currency === "BDT") bdt -= e.amount;
      else rmb -= e.amount;
    });

    // Purchase costs (deduct from BDT)
    const { data: purchases } = await supabase.from("purchase_transactions").select("total_landed_cost_bdt").eq("business_id", businessId!);
    (purchases || []).forEach((p) => { bdt -= p.total_landed_cost_bdt; });

    // Exchanges
    const { data: exch } = await supabase.from("exchanges").select("*").eq("business_id", businessId!).order("created_at", { ascending: false });
    setExchanges(exch || []);
    (exch || []).forEach((e) => {
      if (e.from_currency === "BDT") { bdt -= e.amount_from; rmb += e.amount_to; }
      else { rmb -= e.amount_from; bdt += e.amount_to; }
    });

    setBdtBalance(bdt);
    setRmbBalance(rmb);
  };

  const activeRate = useManualRate && parseFloat(manualRate) > 0 ? parseFloat(manualRate) : exchangeRate;
  const toCurrency = fromCurrency === "BDT" ? "RMB" : "BDT";
  const amt = parseFloat(fromAmount) || 0;
  const toAmount = fromCurrency === "BDT" ? amt / activeRate : amt * activeRate;

  const handleExchange = async () => {
    if (!businessId || !user || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await supabase.from("exchanges").insert({
        from_currency: fromCurrency, to_currency: toCurrency,
        amount_from: amt, amount_to: toAmount, rate: activeRate,
        business_id: businessId, user_id: user.id,
      });
      await supabase.from("activity_log").insert({
        action: "Currency exchange", details: { 
          from: fromCurrency, to: toCurrency, 
          amount_from: amt, amount_to: parseFloat(toAmount.toFixed(2)), 
          rate: activeRate 
        },
        business_id: businessId, user_id: user.id,
      });
      toast.success("Exchange completed!");
      setFromAmount("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Wallet" />
      <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Balance Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-4 lg:p-6 border-l-4 border-l-primary">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <span className="material-symbols-outlined text-primary">payments</span>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">BDT Wallet</span>
            </div>
            <h4 className="text-muted-foreground text-sm font-medium mb-1">BDT Balance</h4>
            <span className="text-2xl lg:text-3xl font-black">৳{bdtBalance.toFixed(2)}</span>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-4 lg:p-6 border-l-4 border-l-muted-foreground">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-muted rounded-lg">
                <span className="material-symbols-outlined text-muted-foreground">currency_exchange</span>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">RMB Wallet</span>
            </div>
            <h4 className="text-muted-foreground text-sm font-medium mb-1">RMB Balance</h4>
            <span className="text-2xl lg:text-3xl font-black">¥{rmbBalance.toFixed(2)}</span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Exchange */}
          <section className="lg:col-span-2">
            <div className="bg-card rounded-2xl border border-border p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Currency Exchange</h3>
                <div className="bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
                  <p className="text-xs font-black text-primary">1 RMB = {activeRate} BDT</p>
                </div>
              </div>

              {/* Manual Rate Toggle */}
              <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted border border-border">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-muted-foreground text-[18px]">tune</span>
                  <span className="text-xs font-semibold text-muted-foreground">Use custom rate for this exchange</span>
                </div>
                <button
                  onClick={() => { setUseManualRate(!useManualRate); if (!useManualRate) setManualRate(String(exchangeRate)); }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${useManualRate ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${useManualRate ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {useManualRate && (
                <div className="mb-4 p-3 rounded-lg bg-muted border border-border">
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Custom Rate (1 RMB = ? BDT)</label>
                  <input
                    className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary/20"
                    type="number"
                    step="0.01"
                    placeholder={String(exchangeRate)}
                    value={manualRate}
                    onChange={(e) => setManualRate(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Default global rate: 1 RMB = {exchangeRate} BDT</p>
                </div>
              )}
              <div className="space-y-4">
                {/* From */}
                <div className="rounded-xl bg-muted p-4 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">From</label>
                    <span className="text-xs text-muted-foreground">
                      Balance: {fromCurrency === "BDT" ? `৳${bdtBalance.toFixed(2)}` : `¥${rmbBalance.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setFromCurrency(fromCurrency === "BDT" ? "RMB" : "BDT")}
                      className="flex items-center gap-1 bg-card px-3 py-2 rounded-lg border border-border min-w-[80px] font-bold text-sm">
                      {fromCurrency} <span className="material-symbols-outlined text-sm text-muted-foreground">expand_more</span>
                    </button>
                    <input className="flex-1 bg-transparent border-none text-xl font-black p-0 focus:ring-0 focus:outline-none text-foreground"
                      type="number" placeholder="0.00" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} />
                  </div>
                </div>

                {/* Swap */}
                <div className="flex justify-center -my-4 relative z-[1]">
                  <button onClick={() => setFromCurrency(fromCurrency === "BDT" ? "RMB" : "BDT")}
                    className="bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-4 border-card hover:rotate-180 transition-transform duration-500">
                    <span className="material-symbols-outlined">swap_vert</span>
                  </button>
                </div>

                {/* To */}
                <div className="rounded-xl bg-muted p-4 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">To (Estimated)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-card px-3 py-2 rounded-lg border border-border min-w-[80px] font-bold text-sm">
                      {toCurrency}
                    </div>
                    <div className="flex-1 text-xl font-black text-muted-foreground">{toAmount.toFixed(2)}</div>
                  </div>
                </div>

                <Button onClick={handleExchange} disabled={saving}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 h-12 rounded-xl mt-2">
                  <span className="material-symbols-outlined mr-1">sync_alt</span>
                  {saving ? "Processing..." : "Exchange Assets"}
                </Button>
              </div>
            </div>
          </section>

          {/* Recent Exchanges */}
          <section className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border p-4 lg:p-6 h-full flex flex-col">
              <h3 className="text-lg font-bold mb-4">Recent Exchanges</h3>
              {exchanges.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <span className="material-symbols-outlined text-3xl text-muted-foreground/40 mb-2">receipt_long</span>
                  <p className="font-bold text-sm">No exchanges yet</p>
                  <p className="text-muted-foreground text-xs mt-1">Convert currencies to see history.</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[400px]">
                  {exchanges.map((ex) => (
                    <div key={ex.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold">{ex.from_currency} → {ex.to_currency}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(ex.created_at), "MMM d")}</span>
                      </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {ex.from_currency === "BDT" ? "৳" : "¥"}{ex.amount_from} → {ex.to_currency === "BDT" ? "৳" : "¥"}{ex.amount_to}
                          <span className="ml-1 opacity-70">@ {ex.rate}</span>
                        </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
