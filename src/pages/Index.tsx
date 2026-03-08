import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format, subDays, startOfDay } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const quickActions = [
  { icon: "point_of_sale", label: "Record Sale", path: "/sales" },
  { icon: "add_box", label: "Add Stock", path: "/inventory" },
  { icon: "payments", label: "Exchange", path: "/wallet" },
  { icon: "assignment_return", label: "Collect Due", path: "/customers" },
];

interface PartnerEquity {
  name: string;
  role: string;
  totalBdt: number;
  percentage: number;
  profitShare: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { businessId, exchangeRate } = useBusiness();
  const [kpis, setKpis] = useState({
    bdtBalance: 0, rmbBalance: 0, totalValueBdt: 0,
    inventory: 0, dues: 0, revenue: 0, netProfit: 0,
  });
  const [partners, setPartners] = useState<PartnerEquity[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [dailySales, setDailySales] = useState<{ day: string; revenue: number; profit: number }[]>([]);
  const [topItems, setTopItems] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [lowStockItems, setLowStockItems] = useState<{ name: string; stock: number; threshold: number }[]>([]);

  useEffect(() => {
    if (!businessId) return;
    fetchDashboard();
  }, [businessId, exchangeRate]);

  const fetchDashboard = async () => {
    const sevenDaysAgo = startOfDay(subDays(new Date(), 6)).toISOString();
    const [capsRes, salesRes, paymentsRes, expsRes, purchasesRes, invRes, custsRes, exchRes, partnersRes, actsRes, recentSalesRes] = await Promise.all([
      supabase.from("capital_contributions").select("amount, currency, partner_id").eq("business_id", businessId!),
      supabase.from("sales").select("received_now_bdt, expected_profit, unit_price_bdt, quantity").eq("business_id", businessId!),
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

    const totalValueBdt = bdt + rmb * exchangeRate;

    let inventoryCost = 0;
    if (invItems.length > 0) {
      for (const item of invItems) {
        const { data: lastPurchase } = await supabase.from("purchase_transactions").select("landed_cost_per_unit_bdt")
          .eq("item_id", item.id).order("created_at", { ascending: false }).limit(1);
        if (lastPurchase?.[0]) inventoryCost += item.current_stock * lastPurchase[0].landed_cost_per_unit_bdt;
      }
    }

    const totalDues = custs.reduce((s, c) => s + c.total_due, 0);
    // Revenue = total sales amount (unit_price × quantity)
    const totalRevenue = sales.reduce((s, r) => s + r.unit_price_bdt * r.quantity, 0);
    // COGS = Revenue - Expected Profit (expected_profit = selling margin per sale)
    const totalCOGS = totalRevenue - sales.reduce((s, r) => s + r.expected_profit, 0);
    // Operating Expenses (converted to BDT)
    const totalExpenses = exps.reduce((s, e) => s + (e.currency === "RMB" ? e.amount * exchangeRate : e.amount), 0);
    // Net Profit = Revenue - COGS - Operating Expenses
    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    setKpis({ bdtBalance: bdt, rmbBalance: rmb, totalValueBdt, inventory: inventoryCost, dues: totalDues, revenue: totalRevenue, netProfit });

    const partnerCapMap: Record<string, number> = {};
    caps.forEach((c) => {
      const bdtVal = c.currency === "RMB" ? c.amount * exchangeRate : c.amount;
      partnerCapMap[c.partner_id] = (partnerCapMap[c.partner_id] || 0) + bdtVal;
    });
    const totalCap = Object.values(partnerCapMap).reduce((s, v) => s + v, 0);
    const partnerEquities: PartnerEquity[] = partnersList
      .map((p) => {
        const invested = partnerCapMap[p.id] || 0;
        const pct = totalCap > 0 ? (invested / totalCap) * 100 : 0;
        return {
          name: p.name,
          role: (p as any).role || "working",
          totalBdt: invested,
          percentage: pct,
          profitShare: netProfit > 0 ? (pct / 100) * netProfit : 0,
        };
      })
      .sort((a, b) => b.totalBdt - a.totalBdt);
    setPartners(partnerEquities);
    setActivities(actsRes.data || []);

    const recentSales = recentSalesRes.data || [];
    const dayMap: Record<string, { revenue: number; profit: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, "dd MMM");
      dayMap[key] = { revenue: 0, profit: 0 };
    }
    recentSales.forEach((s: any) => {
      const key = format(new Date(s.created_at), "dd MMM");
      if (dayMap[key]) {
        dayMap[key].revenue += s.unit_price_bdt * s.quantity;
        dayMap[key].profit += s.expected_profit;
      }
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

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Dashboard" />
      <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Quick Actions — compact on mobile */}
        <section className="grid grid-cols-4 gap-2 lg:hidden">
          {quickActions.map((action) => (
            <button key={action.label} onClick={() => navigate(action.path)}
              className="flex flex-col items-center justify-center p-3 bg-card rounded-xl border border-border active:scale-95 transition-all">
              <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center mb-1">
                <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
              </div>
              <span className="text-[10px] font-bold text-foreground leading-tight text-center">{action.label}</span>
            </button>
          ))}
        </section>

        {/* Business Snapshot */}
        <section>
          <h3 className="text-sm lg:text-lg font-bold mb-2 lg:mb-3">Business Snapshot</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
            {/* Total Business Value */}
            <div className="bg-card p-3 lg:p-5 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-1 lg:mb-2">
                <span className="p-1 lg:p-1.5 rounded-lg text-blue-600 bg-blue-50">
                  <span className="material-symbols-outlined text-[16px] lg:text-[20px]">account_balance</span>
                </span>
              </div>
              <p className="text-muted-foreground text-[10px] lg:text-xs font-medium">Total Value</p>
              <p className="text-lg lg:text-2xl font-black mt-0.5 text-foreground">৳{kpis.totalValueBdt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              <div className="mt-1.5 lg:mt-2 pt-1.5 lg:pt-2 border-t border-border space-y-0.5 lg:space-y-1">
                <div className="flex justify-between text-[10px] lg:text-xs">
                  <span className="text-muted-foreground">BDT</span>
                  <span className="font-bold">৳{kpis.bdtBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-[10px] lg:text-xs">
                  <span className="text-muted-foreground">RMB</span>
                  <span className="font-bold">¥{kpis.rmbBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-card p-3 lg:p-5 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-1 lg:mb-2">
                <span className="p-1 lg:p-1.5 rounded-lg text-purple-600 bg-purple-50">
                  <span className="material-symbols-outlined text-[16px] lg:text-[20px]">inventory_2</span>
                </span>
              </div>
              <p className="text-muted-foreground text-[10px] lg:text-xs font-medium">Inventory</p>
              <p className="text-lg lg:text-2xl font-black mt-0.5 text-foreground">৳{kpis.inventory.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </div>

            {/* Dues */}
            <div className="bg-card p-3 lg:p-5 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-1 lg:mb-2">
                <span className="p-1 lg:p-1.5 rounded-lg text-amber-600 bg-amber-50">
                  <span className="material-symbols-outlined text-[16px] lg:text-[20px]">person_search</span>
                </span>
              </div>
              <p className="text-muted-foreground text-[10px] lg:text-xs font-medium">Dues</p>
              <p className="text-lg lg:text-2xl font-black mt-0.5 text-foreground">৳{kpis.dues.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </div>

            {/* Net Profit */}
            <div className="bg-card p-3 lg:p-5 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-1 lg:mb-2">
                <span className="p-1 lg:p-1.5 rounded-lg text-emerald-600 bg-emerald-50">
                  <span className="material-symbols-outlined text-[16px] lg:text-[20px]">trending_up</span>
                </span>
              </div>
              <p className="text-muted-foreground text-[10px] lg:text-xs font-medium">Net Profit</p>
              <p className="text-lg lg:text-2xl font-black mt-0.5 text-foreground">৳{kpis.netProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </section>

        {/* Analytics Row */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
            {/* Daily Sales Chart */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-3 lg:p-5">
              <h3 className="text-xs lg:text-sm font-bold text-foreground mb-2 lg:mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] lg:text-[20px]">bar_chart</span>
                Last 7 Days Sales
              </h3>
              {dailySales.some(d => d.revenue > 0) ? (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1 text-[10px] lg:text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(var(--primary))" }} />
                      <span className="text-muted-foreground">Revenue</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] lg:text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
                      <span className="text-muted-foreground">Profit</span>
                    </div>
                  </div>
                  <div className="h-36 lg:h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailySales} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35}
                          tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                          formatter={(value: number, name: string) => [`৳${value.toLocaleString("en-IN")}`, name === "revenue" ? "Revenue" : "Profit"]}
                          cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                        />
                        <Bar dataKey="revenue" name="revenue" fill="hsl(var(--primary))" radius={[3,3,0,0]} barSize={12} opacity={0.85} />
                        <Bar dataKey="profit" name="profit" fill="hsl(142, 71%, 45%)" radius={[3,3,0,0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="h-36 lg:h-48 flex items-center justify-center text-center">
                  <div>
                    <span className="material-symbols-outlined text-2xl text-muted-foreground/30 block mb-1">show_chart</span>
                    <p className="text-xs text-muted-foreground">No sales in the last 7 days</p>
                  </div>
                </div>
              )}
            </div>

            {/* Top Items + Low Stock */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">
              <div className="bg-card rounded-xl border border-border p-3 lg:p-4">
                <h3 className="text-xs font-bold text-foreground mb-2 lg:mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-600 text-[16px] lg:text-[20px]">emoji_events</span>
                  Top Items
                </h3>
                {topItems.length > 0 ? (
                  <div className="space-y-1.5 lg:space-y-2">
                    {topItems.slice(0, 3).map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-[10px] lg:text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-muted-foreground font-bold w-3">#{i + 1}</span>
                          <span className="font-medium truncate">{item.name}</span>
                        </div>
                        <span className="font-bold shrink-0 ml-1">৳{item.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-2">No data</p>
                )}
              </div>

              <div className="bg-card rounded-xl border border-border p-3 lg:p-4">
                <h3 className="text-xs font-bold text-foreground mb-2 lg:mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-destructive text-[16px] lg:text-[20px]">warning</span>
                  Low Stock
                </h3>
                {lowStockItems.length > 0 ? (
                  <div className="space-y-1.5 lg:space-y-2">
                    {lowStockItems.slice(0, 3).map(item => (
                      <div key={item.name} className="flex items-center justify-between text-[10px] lg:text-xs">
                        <span className="font-medium truncate">{item.name}</span>
                        <span className={`font-bold px-1 py-0.5 rounded text-[9px] lg:text-[10px] ${item.stock === 0 ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                          {item.stock === 0 ? "Out" : `${item.stock}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-2">All stocked ✓</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Partner Equity */}
        <section>
          <h3 className="text-sm lg:text-lg font-bold mb-2 lg:mb-3">Partner Equity</h3>
          {partners.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <span className="material-symbols-outlined text-2xl text-muted-foreground/40 mb-1">group</span>
              <p className="font-bold text-sm">No partners yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add partners and contribute capital.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {partners.some(p => p.percentage > 0) && (
                <div className="px-3 pt-3">
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full">
                    {partners.filter(p => p.percentage > 0).map((p, i) => (
                      <div key={p.name} className={`${colors[i % colors.length]} transition-all duration-500`}
                        style={{ width: `${p.percentage}%` }} />
                    ))}
                  </div>
                </div>
              )}
              <div className="divide-y divide-border">
                {partners.map((p, i) => (
                  <div key={p.name} className="px-3 py-2.5 lg:px-4 lg:py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-7 w-7 lg:h-8 lg:w-8 rounded-full ${colors[i % colors.length]} flex items-center justify-center text-white text-[10px] lg:text-xs font-bold`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs lg:text-sm font-semibold text-foreground">{p.name}</p>
                        <p className="text-[9px] lg:text-[10px] text-muted-foreground capitalize">{p.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs lg:text-sm font-bold text-foreground">৳{p.totalBdt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-[9px] lg:text-[10px] text-muted-foreground">{p.percentage.toFixed(1)}%</span>
                        {p.profitShare > 0 && (
                          <span className="text-[9px] lg:text-[10px] font-medium text-emerald-600">+৳{p.profitShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions — Desktop */}
        <section className="hidden lg:block">
          <h3 className="text-lg font-bold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button key={action.label} onClick={() => navigate(action.path)}
                className="flex flex-col items-center justify-center p-8 bg-card rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <span className="material-symbols-outlined text-[24px]">{action.icon}</span>
                </div>
                <span className="text-sm font-bold">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h3 className="text-sm lg:text-lg font-bold mb-2 lg:mb-3">Recent Activity</h3>
          {activities.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-6 text-center">
              <span className="material-symbols-outlined text-2xl text-muted-foreground/40 mb-1">history</span>
              <p className="font-bold text-sm">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">Actions you perform will appear here.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border divide-y divide-border max-h-[350px] lg:max-h-[400px] overflow-y-auto scrollbar-thin">
              {activities.map((act) => {
                const iconMap: Record<string, { icon: string; color: string }> = {
                  "Recorded sale": { icon: "point_of_sale", color: "text-emerald-600 bg-emerald-50" },
                  "Added expense": { icon: "payments", color: "text-red-600 bg-red-50" },
                  "Deleted expense": { icon: "delete", color: "text-red-600 bg-red-50" },
                  "Currency exchange": { icon: "currency_exchange", color: "text-blue-600 bg-blue-50" },
                  "Added new inventory item": { icon: "add_box", color: "text-purple-600 bg-purple-50" },
                  "Restocked inventory item": { icon: "inventory", color: "text-purple-600 bg-purple-50" },
                  "Added capital contribution": { icon: "account_balance", color: "text-amber-600 bg-amber-50" },
                  "Updated capital contribution": { icon: "edit", color: "text-amber-600 bg-amber-50" },
                  "Deleted capital contribution": { icon: "delete", color: "text-red-600 bg-red-50" },
                  "Collected due payment": { icon: "receipt", color: "text-emerald-600 bg-emerald-50" },
                  "Added new customer": { icon: "person_add", color: "text-blue-600 bg-blue-50" },
                  "Deleted customer": { icon: "person_remove", color: "text-red-600 bg-red-50" },
                  "Added new partner": { icon: "group_add", color: "text-primary bg-primary/10" },
                  "Removed partner": { icon: "group_remove", color: "text-red-600 bg-red-50" },
                };
                const match = iconMap[act.action] || { icon: "bolt", color: "text-primary bg-primary/10" };
                const details = act.details || {};
                let subtitle = "";

                switch (act.action) {
                  case "Recorded sale":
                    subtitle = `${details.item_name || ""} × ${details.quantity || ""}`;
                    if (details.customer_name) subtitle += ` → ${details.customer_name}`;
                    subtitle += ` • ৳${details.total || 0}`;
                    break;
                  case "Added capital contribution":
                    subtitle = details.partner_name || "";
                    subtitle += ` • ${details.currency === "RMB" ? "¥" : "৳"}${details.amount}`;
                    break;
                  case "Currency exchange":
                    subtitle = `${details.from === "BDT" ? "৳" : "¥"}${details.amount_from || details.amount || 0}`;
                    subtitle += ` → ${details.to === "BDT" ? "৳" : "¥"}${details.amount_to || ""}`;
                    break;
                  case "Added new inventory item":
                  case "Restocked inventory item":
                    subtitle = `${details.item_name || ""} × ${details.quantity || ""}`;
                    break;
                  case "Added expense":
                  case "Deleted expense":
                    subtitle = `${details.title || ""} • ${details.currency === "RMB" ? "¥" : "৳"}${details.amount}`;
                    break;
                  case "Collected due payment":
                    subtitle = `${details.customer || ""} • ৳${details.amount || 0}`;
                    break;
                  default:
                    if (details.partner_name) subtitle = details.partner_name;
                    else if (details.item_name) subtitle = details.item_name;
                    if (details.amount) subtitle += ` • ${details.currency === "RMB" ? "¥" : "৳"}${details.amount}`;
                    break;
                }

                const detailRows: { label: string; value: string }[] = [];
                if (details.item_name) detailRows.push({ label: "Item", value: details.item_name });
                if (details.quantity) detailRows.push({ label: "Qty", value: String(details.quantity) });
                if (details.total) detailRows.push({ label: "Total", value: `৳${details.total}` });
                if (details.received !== undefined && details.received !== null) detailRows.push({ label: "Received", value: `৳${details.received}` });
                if (details.due > 0) detailRows.push({ label: "Due", value: `৳${details.due}` });
                if (details.profit !== undefined) detailRows.push({ label: "Profit", value: `৳${details.profit}` });
                if (details.customer_name) detailRows.push({ label: "Customer", value: details.customer_name });
                if (details.customer) detailRows.push({ label: "Customer", value: details.customer });
                if (details.partner_name) detailRows.push({ label: "Partner", value: details.partner_name });
                if (details.amount !== undefined) detailRows.push({ label: "Amount", value: `${details.currency === "RMB" ? "¥" : "৳"}${details.amount}` });
                if (details.rate) detailRows.push({ label: "Rate", value: `1 RMB = ${details.rate} BDT` });

                const isExpanded = expandedActivity === act.id;

                return (
                  <div key={act.id} className="transition-colors hover:bg-muted/30">
                    <button
                      onClick={() => setExpandedActivity(isExpanded ? null : act.id)}
                      className="w-full p-2.5 lg:p-3 flex items-center gap-2.5 lg:gap-3 text-left active:bg-muted/50"
                    >
                      <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center shrink-0 ${match.color}`}>
                        <span className="material-symbols-outlined text-[16px] lg:text-[18px]">{match.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs lg:text-sm truncate">{act.action}</p>
                        {!isExpanded && subtitle && <p className="text-[10px] lg:text-[10px] text-muted-foreground truncate">{subtitle}</p>}
                        <p className="text-[9px] lg:text-[10px] text-muted-foreground">{format(new Date(act.created_at), "MMM d, h:mm a")}</p>
                      </div>
                      <span className={`material-symbols-outlined text-muted-foreground text-[16px] shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                        expand_more
                      </span>
                    </button>
                    {isExpanded && detailRows.length > 0 && (
                      <div className="px-2.5 pb-2.5 ml-9 lg:ml-11 animate-in slide-in-from-top-1 duration-200">
                        <div className="bg-muted rounded-lg p-2.5 space-y-1">
                          {detailRows.map((row, i) => (
                            <div key={i} className="flex justify-between items-center text-[10px] lg:text-xs">
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
        </section>
      </div>
    </div>
  );
};

export default Index;
