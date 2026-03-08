import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";

const Reports = () => {
  const { businessId, exchangeRate } = useBusiness();
  const [period, setPeriod] = useState("month");
  const [metrics, setMetrics] = useState({ sales: 0, profit: 0, dues: 0, netProfit: 0 });
  const [partnerShares, setPartnerShares] = useState<any[]>([]);

  useEffect(() => {
    if (!businessId) return;
    fetchMetrics();
  }, [businessId, period]);

  const fetchMetrics = async () => {
    const now = new Date();
    let startDate: Date;
    if (period === "week") {
      startDate = new Date(now); startDate.setDate(now.getDate() - 7);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const start = startDate.toISOString();

    // Sales
    const { data: salesData } = await supabase.from("sales").select("unit_price_bdt, quantity, expected_profit, due")
      .eq("business_id", businessId!).gte("created_at", start);
    const totalSales = (salesData || []).reduce((s, r) => s + r.unit_price_bdt * r.quantity, 0);
    const totalProfit = (salesData || []).reduce((s, r) => s + r.expected_profit, 0);

    // All dues
    const { data: custData } = await supabase.from("customers").select("total_due").eq("business_id", businessId!);
    const totalDues = (custData || []).reduce((s, c) => s + c.total_due, 0);

    // Expenses in period
    const { data: expData } = await supabase.from("expenses").select("amount, currency")
      .eq("business_id", businessId!).gte("created_at", start);
    const totalExpenses = (expData || []).reduce((s, e) => s + (e.currency === "BDT" ? e.amount : e.amount * exchangeRate), 0);

    const netProfit = totalProfit - totalExpenses;

    setMetrics({ sales: totalSales, profit: totalProfit, dues: totalDues, netProfit });

    // Partner profit shares
    const { data: partners } = await supabase.from("partners").select("id, name, role, status").eq("business_id", businessId!).eq("status", "accepted");
    const { data: caps } = await supabase.from("capital_contributions").select("partner_id, amount, currency").eq("business_id", businessId!);

    const pShares = (partners || []).map((p) => {
      const pCaps = (caps || []).filter((c) => c.partner_id === p.id);
      const totalCap = pCaps.reduce((s, c) => s + (c.currency === "RMB" ? c.amount * exchangeRate : c.amount), 0);
      return { ...p, totalCap };
    });
    const grandTotal = pShares.reduce((s, p) => s + p.totalCap, 0);
    setPartnerShares(pShares.map((p) => ({
      ...p,
      pct: grandTotal > 0 ? (p.totalCap / grandTotal * 100) : 0,
      profitShare: grandTotal > 0 ? (p.totalCap / grandTotal * netProfit) : 0,
    })));
  };

  const metricCards = [
    { label: "Total Sales", value: `৳${metrics.sales.toFixed(0)}`, icon: "trending_up", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    { label: "Gross Profit", value: `৳${metrics.profit.toFixed(0)}`, icon: "payments", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
    { label: "Outstanding Dues", value: `৳${metrics.dues.toFixed(0)}`, icon: "pending_actions", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
    { label: "Net Profit", value: `৳${metrics.netProfit.toFixed(0)}`, icon: "account_balance_wallet", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Reports" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Period Tabs */}
          <div className="border-b border-border flex gap-6 overflow-x-auto">
            {["week", "month", "year"].map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`pb-3 text-sm font-bold whitespace-nowrap ${
                  period === p ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >{p.charAt(0).toUpperCase() + p.slice(1)}</button>
            ))}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            {metricCards.map((m) => (
              <div key={m.label} className="bg-card p-4 lg:p-6 rounded-xl border border-border">
                <div className="flex justify-between items-start mb-3">
                  <span className={`material-symbols-outlined p-2 rounded-lg ${m.iconBg} ${m.iconColor}`}>{m.icon}</span>
                </div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">{m.label}</p>
                <h4 className="text-xl lg:text-2xl font-bold text-foreground mt-1">{m.value}</h4>
              </div>
            ))}
          </div>

          {/* Partner Profit Share */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-border">
              <h5 className="text-lg font-bold">Partner Profit Share</h5>
              <p className="text-xs text-muted-foreground">Distribution based on capital equity</p>
            </div>
            {partnerShares.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-muted-foreground/50 mb-2">pie_chart</span>
                <p className="font-bold">No partner data</p>
                <p className="text-sm text-muted-foreground mt-1">Add partners and capital to see profit distribution.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {partnerShares.map((p) => (
                  <div key={p.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.role} • {p.pct.toFixed(1)}% equity</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${p.profitShare >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        ৳{p.profitShare.toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Capital: ৳{p.totalCap.toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
