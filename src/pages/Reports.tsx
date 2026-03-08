import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart, Line,
} from "recharts";

interface MonthlyTrend {
  month: string;
  sales: number;
  expenses: number;
  stockCost: number;
  profit: number;
}

const Reports = () => {
  const { businessId, exchangeRate } = useBusiness();
  const [period, setPeriod] = useState("month");
  const [metrics, setMetrics] = useState({ sales: 0, profit: 0, dues: 0, netProfit: 0 });
  const [partnerShares, setPartnerShares] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [trendMonths, setTrendMonths] = useState(6);

  useEffect(() => {
    if (!businessId) return;
    fetchMetrics();
  }, [businessId, period]);

  useEffect(() => {
    if (!businessId) return;
    fetchMonthlyTrends();
  }, [businessId, exchangeRate, trendMonths]);

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

    const { data: salesData } = await supabase.from("sales").select("unit_price_bdt, quantity, expected_profit, due")
      .eq("business_id", businessId!).gte("created_at", start);
    const totalSales = (salesData || []).reduce((s, r) => s + r.unit_price_bdt * r.quantity, 0);
    const totalProfit = (salesData || []).reduce((s, r) => s + r.expected_profit, 0);

    const { data: custData } = await supabase.from("customers").select("total_due").eq("business_id", businessId!);
    const totalDues = (custData || []).reduce((s, c) => s + c.total_due, 0);

    const { data: expData } = await supabase.from("expenses").select("amount, currency")
      .eq("business_id", businessId!).gte("created_at", start);
    const totalExpenses = (expData || []).reduce((s, e) => s + (e.currency === "BDT" ? e.amount : e.amount * exchangeRate), 0);

    const netProfit = totalProfit - totalExpenses;
    setMetrics({ sales: totalSales, profit: totalProfit, dues: totalDues, netProfit });

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

  const fetchMonthlyTrends = async () => {
    const now = new Date();
    const rangeStart = startOfMonth(subMonths(now, trendMonths - 1)).toISOString();

    const [salesRes, expRes, purchRes] = await Promise.all([
      supabase.from("sales").select("unit_price_bdt, quantity, expected_profit, created_at")
        .eq("business_id", businessId!).gte("created_at", rangeStart),
      supabase.from("expenses").select("amount, currency, created_at")
        .eq("business_id", businessId!).gte("created_at", rangeStart),
      supabase.from("purchase_transactions").select("total_landed_cost_bdt, created_at")
        .eq("business_id", businessId!).gte("created_at", rangeStart),
    ]);

    const sales = salesRes.data || [];
    const expenses = expRes.data || [];
    const purchases = purchRes.data || [];

    const data: MonthlyTrend[] = [];
    for (let i = trendMonths - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const label = format(monthDate, "MMM yy");

      const inRange = (d: string) => { const dt = new Date(d); return dt >= mStart && dt <= mEnd; };

      const mSales = sales.filter(s => inRange(s.created_at));
      const mExp = expenses.filter(e => inRange(e.created_at));
      const mPurch = purchases.filter(p => inRange(p.created_at));

      const totalSales = mSales.reduce((s, r) => s + Number(r.unit_price_bdt) * Number(r.quantity), 0);
      const totalProfit = mSales.reduce((s, r) => s + Number(r.expected_profit), 0);
      const totalExp = mExp.reduce((s, e) => s + (e.currency === "RMB" ? Number(e.amount) * exchangeRate : Number(e.amount)), 0);
      const totalStock = mPurch.reduce((s, p) => s + Number(p.total_landed_cost_bdt), 0);

      data.push({
        month: label,
        sales: Math.round(totalSales),
        expenses: Math.round(totalExp),
        stockCost: Math.round(totalStock),
        profit: Math.round(totalProfit - totalExp),
      });
    }
    setMonthlyTrends(data);
  };

  const metricCards = [
    { label: "Total Sales", value: `৳${metrics.sales.toFixed(0)}`, icon: "trending_up", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    { label: "Gross Profit", value: `৳${metrics.profit.toFixed(0)}`, icon: "payments", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
    { label: "Outstanding Dues", value: `৳${metrics.dues.toFixed(0)}`, icon: "pending_actions", iconBg: "bg-orange-100", iconColor: "text-orange-600" },
    { label: "Net Profit", value: `৳${metrics.netProfit.toFixed(0)}`, icon: "account_balance_wallet", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
  ];

  const formatCurrency = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1.5">
        <p className="font-bold text-foreground">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground capitalize">{entry.name}</span>
            </div>
            <span className="font-bold text-foreground">৳{Number(entry.value).toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    );
  };

  const hasData = monthlyTrends.some(m => m.sales > 0 || m.expenses > 0 || m.stockCost > 0);

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

          {/* Monthly Trends */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h5 className="text-lg font-bold text-foreground">Monthly Trends</h5>
                <p className="text-xs text-muted-foreground">Sales, expenses, stock purchases & net profit by month</p>
              </div>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {[6, 12].map((n) => (
                  <button key={n} onClick={() => setTrendMonths(n)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      trendMonths === n ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >{n}M</button>
                ))}
              </div>
            </div>
            {!hasData ? (
              <div className="p-8 lg:p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-muted-foreground/30 block mb-2">show_chart</span>
                <p className="font-bold text-foreground">No data yet</p>
                <p className="text-sm text-muted-foreground mt-1">Record sales, expenses, or stock purchases to see monthly trends.</p>
              </div>
            ) : (
              <div className="p-4 lg:p-6 space-y-6">
                {/* Combined Chart */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Revenue vs Expenses</p>
                  <div className="h-64 lg:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyTrends} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(217, 84%, 53%)" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="hsl(217, 84%, 53%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} tickFormatter={formatCurrency} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                        <Bar dataKey="sales" name="Sales" fill="hsl(217, 84%, 53%)" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="expenses" name="Expenses" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} barSize={20} opacity={0.8} />
                        <Bar dataKey="stockCost" name="Stock Purchases" fill="hsl(270, 60%, 55%)" radius={[4, 4, 0, 0]} barSize={20} opacity={0.7} />
                        <Line type="monotone" dataKey="profit" name="Net Profit" stroke="hsl(160, 84%, 39%)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(160, 84%, 39%)", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly breakdown table */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Monthly Breakdown</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2.5 px-3 font-bold text-muted-foreground">Month</th>
                          <th className="text-right py-2.5 px-3 font-bold text-muted-foreground">Sales</th>
                          <th className="text-right py-2.5 px-3 font-bold text-muted-foreground">Expenses</th>
                          <th className="text-right py-2.5 px-3 font-bold text-muted-foreground">Stock</th>
                          <th className="text-right py-2.5 px-3 font-bold text-muted-foreground">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {monthlyTrends.map((m) => (
                          <tr key={m.month} className="hover:bg-muted/50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-foreground">{m.month}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-foreground">৳{m.sales.toLocaleString("en-IN")}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-destructive">৳{m.expenses.toLocaleString("en-IN")}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-foreground">৳{m.stockCost.toLocaleString("en-IN")}</td>
                            <td className={`py-2.5 px-3 text-right font-bold ${m.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                              {m.profit >= 0 ? "+" : ""}৳{m.profit.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
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