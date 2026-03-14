import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format, subDays, startOfDay } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const quickActions = [
  { icon: "point_of_sale", label: "Sale", path: "/sales" },
  { icon: "add_box", label: "Stock", path: "/inventory" },
  { icon: "payments", label: "Exchange", path: "/wallet" },
  { icon: "assignment_return", label: "Collect", path: "/customers" },
];

interface PartnerEquity {
  name: string;
  role: string;
  totalBdt: number;
  percentage: number;
  profitShare: number;
}

const fmt = (n: number) => {
  const abs = Math.abs(Math.round(n));
  return (n < 0 ? "-" : "") + "৳" + abs.toLocaleString("en-IN");
};

const Index = () => {
  const navigate = useNavigate();
  const { businessId, exchangeRate, isSolo } = useBusiness();
  const [kpis, setKpis] = useState({
    bdtBalance: 0, rmbBalance: 0, totalValueBdt: 0,
    inventory: 0, dues: 0, revenue: 0, realizedProfit: 0,
    totalExpenses: 0, totalCOGS: 0, cashBalance: 0,
    breakEvenRemaining: 0, breakEvenProgress: 0, totalInvestment: 0,
    payables: 0,
  });
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [calculatedCash, setCalculatedCash] = useState(0);
  const [editingCash, setEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [partners, setPartners] = useState<PartnerEquity[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [dailySales, setDailySales] = useState<{ day: string; revenue: number; profit: number }[]>([]);
  const [topItems, setTopItems] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [lowStockItems, setLowStockItems] = useState<{ name: string; stock: number; threshold: number }[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");

  useEffect(() => {
    if (!businessId) return;
    fetchDashboard();
  }, [businessId, exchangeRate]);

  const handleSaveCash = async () => {
    if (!businessId) return;
    const val = parseFloat(cashInput);
    if (isNaN(val)) { toast.error("Enter a valid amount"); return; }
    await supabase.from("businesses").update({ cash_balance: val } as any).eq("id", businessId);
    setCashBalance(val);
    setEditingCash(false);
    toast.success("Cash balance updated");
  };

  const handleResetCash = async () => {
    if (!businessId) return;
    await supabase.from("businesses").update({ cash_balance: null } as any).eq("id", businessId);
    setCashBalance(null);
    setEditingCash(false);
    toast.success("Using auto-calculated cash balance");
  };

  const fetchDashboard = async () => {
    const sevenDaysAgo = startOfDay(subDays(new Date(), 6)).toISOString();
    const [capsRes, salesRes, paymentsRes, expsRes, purchasesRes, invRes, custsRes, exchRes, partnersRes, actsRes, recentSalesRes, bizRes, valuationRes] = await Promise.all([
      supabase.from("capital_contributions").select("amount, currency, partner_id").eq("business_id", businessId!),
      supabase.from("sales").select("received_now_bdt, expected_profit, unit_price_bdt, quantity, item_id, cost_rate, due").eq("business_id", businessId!),
      supabase.from("customer_ledger").select("amount").eq("business_id", businessId!).eq("transaction_type", "payment"),
      supabase.from("expenses").select("amount, currency").eq("business_id", businessId!),
      supabase.from("purchase_transactions").select("total_landed_cost_bdt, buying_cost_per_unit_rmb, quantity, exchange_rate_used").eq("business_id", businessId!),
      supabase.from("inventory_items").select("id, name, current_stock, low_stock_threshold").eq("business_id", businessId!),
      supabase.from("customers").select("total_due").eq("business_id", businessId!),
      supabase.from("exchanges").select("*").eq("business_id", businessId!),
      supabase.from("partners").select("id, name, status").eq("business_id", businessId!),
      supabase.from("activity_log").select("*").eq("business_id", businessId!).order("created_at", { ascending: false }).limit(15),
      supabase.from("sales").select("unit_price_bdt, quantity, expected_profit, created_at, item_id, inventory_items(name)")
        .eq("business_id", businessId!).gte("created_at", sevenDaysAgo),
      supabase.from("businesses").select("cash_balance").eq("id", businessId!).single(),
      supabase.rpc("get_business_valuation", { p_business_id: businessId! }),
    ]);

    const caps = capsRes.data || [];
    const sales = salesRes.data || [];
    const payments = paymentsRes.data || [];
    const exps = expsRes.data || [];
    const purchases = purchasesRes.data || [];
    const invItems = invRes.data || [];
    const custs = custsRes.data || [];
    const exchanges = exchRes.data || [];
    const partnersList = partnersRes.data || [];

    // Use server-side valuation if available
    const valuation = valuationRes.data as any;

    let bdt = 0, rmb = 0;
    caps.forEach((c) => { if (c.currency === "BDT") bdt += c.amount; else rmb += c.amount; });
    sales.forEach((s) => { bdt += s.received_now_bdt; });
    payments.forEach((p) => { bdt += p.amount; });
    exps.forEach((e) => { if (e.currency === "BDT") bdt -= e.amount; else rmb -= e.amount; });
    purchases.forEach((p) => {
      const buyingRmb = (p.buying_cost_per_unit_rmb || 0) * (p.quantity || 0);
      rmb -= buyingRmb;
      const bdtPortion = (p.total_landed_cost_bdt || 0) - (buyingRmb * (p.exchange_rate_used || 0));
      bdt -= bdtPortion;
    });
    exchanges.forEach((e) => {
      if (e.from_currency === "BDT") { bdt -= e.amount_from; rmb += e.amount_to; }
      else { rmb -= e.amount_from; bdt += e.amount_to; }
    });

    // Realized Profit
    const realizedProfit = sales.reduce((s, sale: any) => {
      const costPerUnit = sale.cost_rate || 0;
      return s + sale.quantity * (sale.unit_price_bdt - costPerUnit);
    }, 0);

    const totalRevenue = sales.reduce((s, r) => s + r.unit_price_bdt * r.quantity, 0);
    const totalCOGS = sales.reduce((s, sale: any) => s + sale.quantity * (sale.cost_rate || 0), 0);
    const totalExpenses = exps.reduce((s, e) => s + (e.currency === "RMB" ? e.amount * exchangeRate : e.amount), 0);
    const totalInvestment = purchases.reduce((s, p) => s + (p.total_landed_cost_bdt || 0), 0);

    // Use RPC values if available, otherwise fallback to client-side
    const cashBalanceCalc = valuation ? Number(valuation.cash) : (
      sales.reduce((s, r) => s + r.received_now_bdt, 0) + payments.reduce((s, p) => s + p.amount, 0) - totalInvestment - totalExpenses
    );
    const inventoryCost = valuation ? Number(valuation.inventory_value) : 0;
    const totalDues = valuation ? Number(valuation.dues_receivable) : Math.max(
      custs.reduce((s, c) => s + (c.total_due || 0), 0),
      sales.reduce((s, sale: any) => s + ((sale as any).due || 0), 0)
    );
    const payables = valuation ? Number(valuation.payables) : 0;
    const rmbInBdt = rmb * exchangeRate;
    const totalCashBdt = bdt + rmbInBdt;
    const totalAssets = totalCashBdt + inventoryCost + totalDues;
    const totalValueBdt = totalAssets - payables;

    // Break-even
    const totalReceived = sales.reduce((s, r) => s + r.received_now_bdt, 0) + payments.reduce((s, p) => s + p.amount, 0);
    const totalOutflow = totalInvestment + totalExpenses;
    const breakEvenProgress = totalOutflow > 0 ? Math.min(100, (totalReceived / totalOutflow) * 100) : 100;
    const breakEvenRemaining = cashBalanceCalc < 0 ? Math.abs(cashBalanceCalc) : 0;

    setKpis({ bdtBalance: bdt, rmbBalance: rmb, totalValueBdt, inventory: inventoryCost, dues: totalDues, revenue: totalRevenue, realizedProfit, totalExpenses, totalCOGS, cashBalance: cashBalanceCalc, breakEvenRemaining, breakEvenProgress, totalInvestment, payables });
    setCalculatedCash(cashBalanceCalc);
    setCashBalance(bizRes.data?.cash_balance ?? null);

    const partnerCapMap: Record<string, number> = {};
    caps.forEach((c) => {
      const bdtVal = c.currency === "RMB" ? c.amount * exchangeRate : c.amount;
      partnerCapMap[c.partner_id] = (partnerCapMap[c.partner_id] || 0) + bdtVal;
    });
    const totalCap = Object.values(partnerCapMap).reduce((s, v) => s + v, 0);
    const equalSplit = totalCap === 0 && partnersList.length > 0;
    const partnerEquities: PartnerEquity[] = partnersList
      .map((p) => {
        const invested = partnerCapMap[p.id] || 0;
        const pct = equalSplit
          ? 100 / partnersList.length
          : (totalCap > 0 ? (invested / totalCap) * 100 : 0);
        return { name: p.name, role: (p as any).role || "working", totalBdt: invested, percentage: pct, profitShare: realizedProfit > 0 ? (pct / 100) * realizedProfit : 0 };
      })
      .sort((a, b) => b.percentage - a.percentage);
    setPartners(partnerEquities);
    setActivities(actsRes.data || []);

    const recentSales = recentSalesRes.data || [];
    const dayMap: Record<string, { revenue: number; profit: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      dayMap[format(d, "dd MMM")] = { revenue: 0, profit: 0 };
    }
    recentSales.forEach((s: any) => {
      const key = format(new Date(s.created_at), "dd MMM");
      if (dayMap[key]) { dayMap[key].revenue += s.unit_price_bdt * s.quantity; dayMap[key].profit += s.expected_profit; }
    });
    setDailySales(Object.entries(dayMap).map(([day, v]) => ({ day, ...v })));

    const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    recentSales.forEach((s: any) => {
      const name = s.inventory_items?.name || "Unknown";
      if (!itemMap[name]) itemMap[name] = { name, quantity: 0, revenue: 0 };
      itemMap[name].quantity += s.quantity;
      itemMap[name].revenue += s.unit_price_bdt * s.quantity;
    });
    setTopItems(Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

    const lowStock = invItems
      .filter(i => (i as any).current_stock <= (i as any).low_stock_threshold)
      .map(i => ({ name: (i as any).name, stock: (i as any).current_stock, threshold: (i as any).low_stock_threshold }))
      .sort((a, b) => a.stock - b.stock);
    setLowStockItems(lowStock);
  };

  const colors = ["bg-sky-500", "bg-orange-500", "bg-emerald-500", "bg-rose-500", "bg-violet-500"];
  const displayCash = cashBalance ?? calculatedCash;

  const iconMap: Record<string, { icon: string; color: string }> = {
    "Recorded sale": { icon: "point_of_sale", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
    "Added expense": { icon: "payments", color: "text-red-600 bg-red-50 dark:bg-red-950/40" },
    "Deleted expense": { icon: "delete", color: "text-red-600 bg-red-50 dark:bg-red-950/40" },
    "Currency exchange": { icon: "currency_exchange", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
    "Added new inventory item": { icon: "add_box", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
    "Restocked inventory item": { icon: "inventory", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
    "Added capital contribution": { icon: "account_balance", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
    "Updated capital contribution": { icon: "edit", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
    "Deleted capital contribution": { icon: "delete", color: "text-red-600 bg-red-50 dark:bg-red-950/40" },
    "Collected due payment": { icon: "receipt", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
    "Added new customer": { icon: "person_add", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
    "Deleted customer": { icon: "person_remove", color: "text-red-600 bg-red-50 dark:bg-red-950/40" },
    "Added new partner": { icon: "group_add", color: "text-primary bg-primary/10" },
    "Removed partner": { icon: "group_remove", color: "text-red-600 bg-red-50 dark:bg-red-950/40" },
  };

  const getSubtitle = (act: any) => {
    const d = act.details || {};
    switch (act.action) {
      case "Recorded sale": return `${d.item_name || ""} × ${d.quantity || ""}${d.unit_price ? ` @৳${d.unit_price}/pc` : ""}${d.customer_name ? ` → ${d.customer_name}` : ""} • ৳${d.total || 0}`;
      case "Added capital contribution": return `${d.partner_name || ""} • ${d.currency === "RMB" ? "¥" : "৳"}${d.amount}`;
      case "Currency exchange": return `${d.from === "BDT" ? "৳" : "¥"}${d.amount_from || d.amount || 0} → ${d.to === "BDT" ? "৳" : "¥"}${d.amount_to || ""}`;
      case "Added new inventory item": case "Restocked inventory item": return `${d.item_name || ""} × ${d.quantity || ""}`;
      case "Added expense": case "Deleted expense": return `${d.title || ""} • ${d.currency === "RMB" ? "¥" : "৳"}${d.amount}`;
      case "Collected due payment": return `${d.customer || ""} • ৳${d.amount || 0}`;
      default: {
        let s = d.partner_name || d.item_name || "";
        if (d.amount) s += ` • ${d.currency === "RMB" ? "¥" : "৳"}${d.amount}`;
        return s;
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Dashboard" />
      <div className="p-3 lg:p-8 space-y-4 lg:space-y-6 max-w-7xl mx-auto w-full">

        {/* Quick Actions — mobile */}
        <div className="flex gap-2 lg:hidden">
          {quickActions.map((a) => (
            <button key={a.label} onClick={() => navigate(a.path)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 bg-card rounded-xl border border-border active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-[20px] text-primary">{a.icon}</span>
              <span className="text-[9px] font-bold text-foreground">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Hero Card — Total Value + Cash */}
        <div className="bg-gradient-to-br from-primary/10 via-card to-card rounded-2xl border border-border p-4 lg:p-6 animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Business Value</p>
              <p className="text-2xl lg:text-4xl font-black text-foreground mt-1">{fmt(kpis.totalValueBdt)}</p>
              <p className="text-[9px] lg:text-[10px] text-muted-foreground mt-0.5">Total Assets − Total Liabilities</p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-[10px] lg:text-xs text-muted-foreground">৳{Math.round(kpis.bdtBalance).toLocaleString("en-IN") } BDT</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground">¥{Math.round(kpis.rmbBalance).toLocaleString("en-IN") } RMB</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-teal-600">payments</span>
              <span className="text-[10px] lg:text-xs text-muted-foreground">Cash:</span>
              <span className="text-xs lg:text-sm font-bold text-foreground">{fmt(displayCash)}</span>
              {cashBalance !== null && <span className="text-[8px] bg-muted text-muted-foreground px-1 rounded">manual</span>}
            </div>
            <button onClick={() => { setEditingCash(!editingCash); setCashInput(String(cashBalance ?? Math.round(calculatedCash))); }}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
              <span className="material-symbols-outlined text-[14px]">{editingCash ? "close" : "edit"}</span>
            </button>
          </div>
          {editingCash && (
            <div className="mt-2 flex gap-2 animate-fade-in">
              <input type="number" value={cashInput} onChange={(e) => setCashInput(e.target.value)}
                className="flex-1 text-sm font-bold bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="Cash amount" autoFocus />
              <button onClick={handleSaveCash} className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg active:scale-95 transition-transform">Save</button>
              {cashBalance !== null && (
                <button onClick={handleResetCash} className="px-3 py-2 text-xs font-bold text-muted-foreground bg-muted rounded-lg active:scale-95 transition-transform">Auto</button>
              )}
            </div>
          )}
        </div>

        {/* Value Breakdown Strip */}
        <div className="bg-card rounded-xl border border-border p-3 lg:p-4 animate-fade-in">
          <h3 className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">pie_chart</span>
            Value Breakdown
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] lg:text-xs">
              <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase w-14">Assets</span>
              <span className="bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 px-2 py-1 rounded-lg font-semibold">BDT {fmt(kpis.bdtBalance)}</span>
              <span className="text-muted-foreground">+</span>
              <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-lg font-semibold">RMB ¥{Math.round(kpis.rmbBalance).toLocaleString("en-IN")} ({fmt(kpis.rmbBalance * exchangeRate)})</span>
              <span className="text-muted-foreground">+</span>
              <span className="bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 px-2 py-1 rounded-lg font-semibold">Inventory {fmt(kpis.inventory)}</span>
              <span className="text-muted-foreground">+</span>
              <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-lg font-semibold">Receivables {fmt(kpis.dues)}</span>
              <span className="text-muted-foreground">=</span>
              <span className="bg-muted text-foreground px-2 py-1 rounded-lg font-bold">{fmt(kpis.bdtBalance + kpis.rmbBalance * exchangeRate + kpis.inventory + kpis.dues)}</span>
            </div>
            {kpis.payables > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] lg:text-xs">
                <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase w-14">Debts</span>
                <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-lg font-semibold">Payables {fmt(kpis.payables)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 text-[11px] lg:text-xs">
              <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground uppercase w-14">Value</span>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-lg font-bold">{fmt(kpis.totalValueBdt)}</span>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
          {[
            { label: "Revenue", value: fmt(kpis.revenue), icon: "point_of_sale", accent: "text-sky-600 bg-sky-100 dark:bg-sky-950/40" },
            { label: "Realized Profit", value: fmt(kpis.realizedProfit), icon: kpis.realizedProfit >= 0 ? "trending_up" : "trending_down", accent: kpis.realizedProfit >= 0 ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40" : "text-destructive bg-destructive/10" },
            { label: "Cash (Net)", value: fmt(kpis.cashBalance), icon: "account_balance_wallet", accent: kpis.cashBalance >= 0 ? "text-teal-600 bg-teal-100 dark:bg-teal-950/40" : "text-destructive bg-destructive/10" },
            { label: "Inventory", value: fmt(kpis.inventory), icon: "inventory_2", accent: "text-purple-600 bg-purple-100 dark:bg-purple-950/40" },
            { label: "Dues", value: fmt(kpis.dues), icon: "person_search", accent: "text-amber-600 bg-amber-100 dark:bg-amber-950/40" },
            ...(kpis.payables > 0 ? [{ label: "Payables", value: fmt(kpis.payables), icon: "money_off", accent: "text-destructive bg-destructive/10" }] : []),
          ].map((k, i) => (
            <div key={k.label} className="bg-card p-3 lg:p-4 rounded-xl border border-border animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`p-1 rounded-lg ${k.accent}`}>
                  <span className="material-symbols-outlined text-[16px]">{k.icon}</span>
                </span>
                <span className="text-[10px] lg:text-xs font-medium text-muted-foreground">{k.label}</span>
              </div>
              <p className={`text-lg lg:text-xl font-black ${
                (k.label === "Realized Profit" && kpis.realizedProfit < 0) || (k.label === "Cash (Net)" && kpis.cashBalance < 0) || k.label === "Payables" ? "text-destructive" : "text-foreground"
              }`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Break-Even Tracker */}
        {kpis.cashBalance < 0 && (
          <div className="bg-card rounded-xl border border-border p-3 lg:p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">flag</span>
                Break-Even Tracker
              </h3>
              <span className={`text-[10px] lg:text-xs font-bold px-2 py-0.5 rounded-full ${
                kpis.cashBalance >= 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}>
                {kpis.cashBalance >= 0 ? "Break-even reached ✓" : `Need ${fmt(Math.abs(kpis.cashBalance))} more revenue`}
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-700 ${kpis.breakEvenProgress >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${Math.min(100, kpis.breakEvenProgress)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] text-muted-foreground">Total Outflow: {fmt(kpis.totalInvestment + kpis.totalExpenses)}</span>
              <span className="text-[9px] text-muted-foreground">Total Inflow: {fmt(kpis.revenue)} ({kpis.breakEvenProgress.toFixed(0)}%)</span>
            </div>
          </div>
        )}


        {/* Mobile Tabs: Overview / Activity */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 lg:hidden">
          {(["overview", "activity"] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {t === "overview" ? "Overview" : "Activity"}
            </button>
          ))}
        </div>

        {/* Overview Content */}
        <div className={`space-y-4 lg:space-y-6 ${activeTab !== "overview" ? "hidden lg:block" : ""}`}>
          {/* Chart + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
            {/* Sales Chart */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-3 lg:p-5">
              <h3 className="text-xs lg:text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
                Last 7 Days
              </h3>
              {dailySales.some(d => d.revenue > 0) ? (
                <div className="h-40 lg:h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailySales} margin={{ top: 5, right: 0, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: "11px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        formatter={(value: number, name: string) => [`৳${value.toLocaleString("en-IN")}`, name === "revenue" ? "Revenue" : "Profit"]}
                        cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                      />
                      <Bar dataKey="revenue" name="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} barSize={14} opacity={0.9} />
                      <Bar dataKey="profit" name="profit" fill="hsl(142, 71%, 45%)" radius={[4,4,0,0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 lg:h-52 flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-3xl text-muted-foreground/20 block mb-2">show_chart</span>
                    <p className="text-xs text-muted-foreground">No sales yet this week</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: Top Items + Low Stock */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="bg-card rounded-xl border border-border p-3">
                <h3 className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Top Items</h3>
                {topItems.length > 0 ? (
                  <div className="space-y-2">
                    {topItems.slice(0, 3).map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-muted-foreground w-4">{i + 1}.</span>
                        <span className="text-[10px] lg:text-xs font-medium truncate flex-1">{item.name}</span>
                        <span className="text-[10px] lg:text-xs font-bold text-foreground shrink-0">{fmt(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[10px] text-muted-foreground text-center py-3">No data</p>}
              </div>

              <div className="bg-card rounded-xl border border-border p-3">
                <h3 className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  {lowStockItems.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />}
                  Low Stock
                </h3>
                {lowStockItems.length > 0 ? (
                  <div className="space-y-2">
                    {lowStockItems.slice(0, 3).map(item => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="text-[10px] lg:text-xs font-medium truncate">{item.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.stock === 0 ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                          {item.stock === 0 ? "Out" : item.stock}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[10px] text-muted-foreground text-center py-3">All stocked ✓</p>}
              </div>
            </div>
          </div>

          {/* Partners */}
          {!isSolo && partners.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
              <div className="p-3 lg:p-4 border-b border-border">
                <h3 className="text-xs lg:text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                  Partner Equity
                </h3>
              </div>
              {partners.some(p => p.percentage > 0) && (
                <div className="px-3 pt-3">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                    {partners.filter(p => p.percentage > 0).map((p, i) => (
                      <div key={p.name} className={`${colors[i % colors.length]} transition-all duration-700`}
                        style={{ width: `${p.percentage}%` }} />
                    ))}
                  </div>
                </div>
              )}
              <div className="divide-y divide-border">
                {partners.map((p, i) => (
                  <div key={p.name} className="px-3 py-2.5 lg:px-4 lg:py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-7 w-7 rounded-full ${colors[i % colors.length]} flex items-center justify-center text-white text-[10px] font-bold`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs lg:text-sm font-semibold text-foreground">{p.name}</p>
                        <p className="text-[9px] text-muted-foreground capitalize">{p.role} · {p.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs lg:text-sm font-bold text-foreground">{fmt(p.totalBdt)}</p>
                      {p.profitShare > 0 && (
                        <p className="text-[9px] font-medium text-emerald-600">+{fmt(p.profitShare)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions — Desktop */}
          <div className="hidden lg:grid grid-cols-4 gap-3">
            {quickActions.map((a) => (
              <button key={a.label} onClick={() => navigate(a.path)}
                className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{a.icon}</span>
                </div>
                <span className="text-sm font-bold">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Feed — always visible on desktop, tab-controlled on mobile */}
        <div className={`${activeTab !== "activity" ? "hidden lg:block" : ""}`}>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-3 lg:p-4 border-b border-border">
              <h3 className="text-xs lg:text-sm font-bold text-foreground flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">history</span>
                Recent Activity
              </h3>
            </div>
            {activities.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-muted-foreground/20 block mb-2">history</span>
                <p className="text-xs text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {activities.map((act) => {
                  const match = iconMap[act.action] || { icon: "bolt", color: "text-primary bg-primary/10" };
                  const subtitle = getSubtitle(act);
                  const isExpanded = expandedActivity === act.id;
                  const details = act.details || {};

                  const detailRows: { label: string; value: string }[] = [];
                  if (details.item_name) detailRows.push({ label: "Item", value: details.item_name });
                  if (details.quantity) detailRows.push({ label: "Qty", value: String(details.quantity) });
                  if (details.unit_price) detailRows.push({ label: "Unit Price", value: `৳${details.unit_price}/pc` });
                  if (details.total) detailRows.push({ label: "Total", value: `৳${details.total}` });
                  if (details.received !== undefined && details.received !== null) detailRows.push({ label: "Received", value: `৳${details.received}` });
                  if (details.due > 0) detailRows.push({ label: "Due", value: `৳${details.due}` });
                  if (details.profit !== undefined) detailRows.push({ label: "Profit", value: `৳${details.profit}` });
                  if (details.customer_name) detailRows.push({ label: "Customer", value: details.customer_name });
                  if (details.customer) detailRows.push({ label: "Customer", value: details.customer });
                  if (details.partner_name) detailRows.push({ label: "Partner", value: details.partner_name });
                  if (details.amount !== undefined) detailRows.push({ label: "Amount", value: `${details.currency === "RMB" ? "¥" : "৳"}${details.amount}` });
                  if (details.rate) detailRows.push({ label: "Rate", value: `1 RMB = ${details.rate} BDT` });

                  return (
                    <div key={act.id} className="transition-colors hover:bg-muted/30">
                      <button onClick={() => setExpandedActivity(isExpanded ? null : act.id)}
                        className="w-full p-3 flex items-center gap-3 text-left active:bg-muted/50">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${match.color}`}>
                          <span className="material-symbols-outlined text-[16px]">{match.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs truncate">{act.action}</p>
                          {!isExpanded && subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
                          <p className="text-[9px] text-muted-foreground">{format(new Date(act.created_at), "MMM d, h:mm a")}</p>
                        </div>
                        <span className={`material-symbols-outlined text-muted-foreground text-[14px] shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                          expand_more
                        </span>
                      </button>
                      {isExpanded && detailRows.length > 0 && (
                        <div className="px-3 pb-3 ml-11 animate-fade-in">
                          <div className="bg-muted/50 rounded-lg p-2.5 space-y-1">
                            {detailRows.map((row, i) => (
                              <div key={i} className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">{row.label}</span>
                                <span className="font-semibold text-foreground">{row.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
