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
  { icon: "payments", label: "Exchange Money", path: "/wallet" },
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
    inventory: 0, dues: 0, netProfit: 0,
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
    // Fetch all data in parallel
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

    // Calculate separate BDT and RMB balances
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

    // Inventory cost
    let inventoryCost = 0;
    if (invItems.length > 0) {
      for (const item of invItems) {
        const { data: lastPurchase } = await supabase.from("purchase_transactions").select("landed_cost_per_unit_bdt")
          .eq("item_id", item.id).order("created_at", { ascending: false }).limit(1);
        if (lastPurchase?.[0]) inventoryCost += item.current_stock * lastPurchase[0].landed_cost_per_unit_bdt;
      }
    }

    // Customer dues
    const totalDues = custs.reduce((s, c) => s + c.total_due, 0);

    // Net profit
    const totalProfit = sales.reduce((s, r) => s + r.expected_profit, 0);
    const totalExpenses = exps.reduce((s, e) => s + (e.currency === "RMB" ? e.amount * exchangeRate : e.amount), 0);
    const netProfit = totalProfit - totalExpenses;

    setKpis({ bdtBalance: bdt, rmbBalance: rmb, totalValueBdt, inventory: inventoryCost, dues: totalDues, netProfit });

    // Partner equity from capital contributions
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

    // Daily sales chart (last 7 days)
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

    // Top selling items (from recent sales)
    const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    recentSales.forEach((s: any) => {
      const name = s.inventory_items?.name || "Unknown";
      if (!itemMap[name]) itemMap[name] = { name, quantity: 0, revenue: 0 };
      itemMap[name].quantity += s.quantity;
      itemMap[name].revenue += s.unit_price_bdt * s.quantity;
    });
    setTopItems(Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

    // Low stock alerts
    const lowStock = invItems
      .filter(i => (i as any).current_stock <= (i as any).low_stock_threshold)
      .map(i => ({ name: (i as any).name, stock: (i as any).current_stock, threshold: (i as any).low_stock_threshold }))
      .sort((a, b) => a.stock - b.stock);
    setLowStockItems(lowStock);
  };

  const colors = ["bg-primary", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];

  return (
    <>
      <ExchangeRateHeader title="Dashboard" />
      <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Business Snapshot */}
        <section>
          <h3 className="text-base lg:text-lg font-bold mb-3">Business Snapshot</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Total Business Value */}
            <div className="bg-card p-4 lg:p-5 rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="p-1.5 rounded-lg text-blue-600 bg-blue-50">
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                </span>
              </div>
              <p className="text-muted-foreground text-xs font-medium">Total Business Value</p>
              <p className="text-xl lg:text-2xl font-black mt-0.5 text-foreground">৳{kpis.totalValueBdt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              <div className="mt-2 pt-2 border-t border-border space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">BDT Balance</span>
                  <span className="font-bold">৳{kpis.bdtBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">RMB Balance</span>
                  <span className="font-bold">¥{kpis.rmbBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-card p-4 lg:p-5 rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="p-1.5 rounded-lg text-purple-600 bg-purple-50">
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                </span>
              </div>
              <p className="text-muted-foreground text-xs font-medium">Inventory Value</p>
              <p className="text-xl lg:text-2xl font-black mt-0.5 text-foreground">৳{kpis.inventory.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </div>

            {/* Dues */}
            <div className="bg-card p-4 lg:p-5 rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="p-1.5 rounded-lg text-amber-600 bg-amber-50">
                  <span className="material-symbols-outlined text-[20px]">person_search</span>
                </span>
              </div>
              <p className="text-muted-foreground text-xs font-medium">Customer Dues</p>
              <p className="text-xl lg:text-2xl font-black mt-0.5 text-foreground">৳{kpis.dues.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </div>

            {/* Net Profit */}
            <div className="bg-card p-4 lg:p-5 rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50">
                  <span className="material-symbols-outlined text-[20px]">trending_up</span>
                </span>
              </div>
              <p className="text-muted-foreground text-xs font-medium">Net Profit</p>
              <p className="text-xl lg:text-2xl font-black mt-0.5 text-foreground">৳{kpis.netProfit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </section>

        {/* Analytics Row: Daily Sales + Top Items + Low Stock */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Daily Sales Chart */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4 lg:p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">bar_chart</span>
                Last 7 Days Sales
              </h3>
              {dailySales.some(d => d.revenue > 0) ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailySales} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={45}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number) => [`৳${value.toLocaleString("en-IN")}`, undefined]}
                      />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} barSize={20} />
                      <Bar dataKey="profit" name="Profit" fill="hsl(142, 71%, 45%)" radius={[4,4,0,0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-center">
                  <div>
                    <span className="material-symbols-outlined text-3xl text-muted-foreground/30 block mb-1">show_chart</span>
                    <p className="text-xs text-muted-foreground">No sales in the last 7 days</p>
                  </div>
                </div>
              )}
            </div>

            {/* Top Items + Low Stock */}
            <div className="space-y-4">
              {/* Top Selling Items */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">emoji_events</span>
                  Top Items (7d)
                </h3>
                {topItems.length > 0 ? (
                  <div className="space-y-2">
                    {topItems.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground font-bold w-4">#{i + 1}</span>
                          <span className="font-medium truncate">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="font-bold">৳{item.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                          <span className="text-muted-foreground ml-1">({item.quantity})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">No sales data</p>
                )}
              </div>

              {/* Low Stock Alerts */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-destructive text-[20px]">warning</span>
                  Low Stock Alerts
                </h3>
                {lowStockItems.length > 0 ? (
                  <div className="space-y-2">
                    {lowStockItems.map(item => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate">{item.name}</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded ${item.stock === 0 ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700"}`}>
                          {item.stock === 0 ? "Out of stock" : `${item.stock} left`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">All items well stocked ✓</p>
                )}
              </div>
            </div>
          </div>
        </section>


        <section>
          <h3 className="text-base lg:text-lg font-bold mb-3">Partner Equity</h3>
          {partners.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <span className="material-symbols-outlined text-3xl text-muted-foreground/40 mb-2">group</span>
              <p className="font-bold">No partners yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add partners and contribute capital to see equity here.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              {/* Equity bar */}
              {partners.some(p => p.percentage > 0) && (
                <div className="px-4 pt-4">
                  <div className="flex h-3 w-full overflow-hidden rounded-full">
                    {partners.filter(p => p.percentage > 0).map((p, i) => (
                      <div key={p.name} className={`${colors[i % colors.length]} transition-all duration-500`}
                        style={{ width: `${p.percentage}%` }} />
                    ))}
                  </div>
                </div>
              )}
              <div className="divide-y divide-border">
                {partners.map((p, i) => (
                  <div key={p.name} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full ${colors[i % colors.length]} flex items-center justify-center text-white text-xs font-bold`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{p.role} Partner</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">৳{p.totalBdt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-[10px] text-muted-foreground">{p.percentage.toFixed(1)}% equity</span>
                        {p.profitShare > 0 && (
                          <span className="text-[10px] font-medium text-emerald-600">+৳{p.profitShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })} profit</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h3 className="text-base lg:text-lg font-bold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
            {quickActions.map((action) => (
              <button key={action.label} onClick={() => navigate(action.path)}
                className="flex flex-col items-center justify-center p-5 lg:p-8 bg-card rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-muted rounded-full flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <span className="material-symbols-outlined text-[20px] lg:text-[24px]">{action.icon}</span>
                </div>
                <span className="text-xs lg:text-sm font-bold">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h3 className="text-base lg:text-lg font-bold mb-3">Recent Activity</h3>
          {activities.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <span className="material-symbols-outlined text-3xl text-muted-foreground/40 mb-2">history</span>
              <p className="font-bold">No activity yet</p>
              <p className="text-sm text-muted-foreground mt-1">Actions you perform will appear here.</p>
            </div>
          ) : (
             <div className="bg-card rounded-xl border border-border divide-y divide-border max-h-[400px] overflow-y-auto scrollbar-thin">
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
                
                // Build rich subtitle based on action type
                switch (act.action) {
                  case "Recorded sale":
                    subtitle = `${details.item_name || ""} × ${details.quantity || ""}`;
                    if (details.customer_name) subtitle += ` → ${details.customer_name}`;
                    subtitle += ` • ৳${details.total || 0}`;
                    if (details.received > 0) subtitle += ` (received ৳${details.received})`;
                    if (details.due > 0) subtitle += ` (due ৳${details.due})`;
                    if (details.profit) subtitle += ` • Profit: ৳${details.profit}`;
                    break;
                  case "Added capital contribution":
                    subtitle = details.partner_name || "";
                    subtitle += ` • ${details.currency === "RMB" ? "¥" : "৳"}${details.amount}`;
                    if (details.currency === "RMB" && details.rate) {
                      subtitle += ` @ ${details.rate} BDT/RMB`;
                      if (details.bdt_equivalent) subtitle += ` = ৳${details.bdt_equivalent.toFixed(0)}`;
                    }
                    break;
                  case "Currency exchange":
                    subtitle = `${details.from === "BDT" ? "৳" : "¥"}${details.amount_from || details.amount || 0}`;
                    subtitle += ` → ${details.to === "BDT" ? "৳" : "¥"}${details.amount_to || ""}`;
                    if (details.rate) subtitle += ` @ ${details.rate} BDT/RMB`;
                    break;
                  case "Added new inventory item":
                  case "Restocked inventory item":
                    subtitle = `${details.item_name || ""} × ${details.quantity || ""}`;
                    if (details.buying_cost_rmb) subtitle += ` • Buy: ¥${details.buying_cost_rmb}/unit`;
                    if (details.total_landed_cost) subtitle += ` • Landed: ৳${details.total_landed_cost}`;
                    if (details.rate) subtitle += ` @ ${details.rate}`;
                    break;
                  case "Added expense":
                  case "Deleted expense":
                    subtitle = details.title || "";
                    subtitle += ` • ${details.currency === "RMB" ? "¥" : "৳"}${details.amount}`;
                    break;
                  case "Collected due payment":
                    subtitle = `${details.customer || ""} • ৳${details.amount || 0}`;
                    break;
                  case "Added new customer":
                    subtitle = details.customer_name || "";
                    if (details.phone) subtitle += ` • ${details.phone}`;
                    break;
                  case "Deleted customer":
                    subtitle = details.customer_name || "";
                    break;
                  case "Updated capital contribution":
                    subtitle = details.partner_name || "";
                    subtitle += ` • ${details.old_currency === "RMB" ? "¥" : "৳"}${details.old_amount} → ${details.new_currency === "RMB" ? "¥" : "৳"}${details.new_amount}`;
                    break;
                  case "Deleted capital contribution":
                    subtitle = `${details.partner_name || ""} • ${details.currency === "RMB" ? "¥" : "৳"}${details.amount}`;
                    break;
                  case "Added new partner":
                    subtitle = `${details.partner_name || ""} • ${details.role || ""}`;
                    break;
                  case "Removed partner":
                    subtitle = details.partner_name || "";
                    break;
                  default:
                    if (details.item_name) subtitle += details.item_name;
                    if (details.amount) subtitle += ` • ${details.currency === "RMB" ? "¥" : "৳"}${details.amount}`;
                    break;
                }
                // Build expanded detail rows
                const detailRows: { label: string; value: string }[] = [];
                if (details.item_name) detailRows.push({ label: "Item", value: details.item_name });
                if (details.quantity) detailRows.push({ label: "Quantity", value: String(details.quantity) });
                if (details.unit_price) detailRows.push({ label: "Unit Price", value: `৳${details.unit_price}` });
                if (details.total) detailRows.push({ label: "Total", value: `৳${details.total}` });
                if (details.received !== undefined && details.received !== null) detailRows.push({ label: "Received", value: `৳${details.received}` });
                if (details.due > 0) detailRows.push({ label: "Due", value: `৳${details.due}` });
                if (details.profit !== undefined) detailRows.push({ label: "Profit", value: `৳${details.profit}` });
                if (details.customer_name) detailRows.push({ label: "Customer", value: details.customer_name });
                if (details.customer) detailRows.push({ label: "Customer", value: details.customer });
                if (details.partner_name) detailRows.push({ label: "Partner", value: details.partner_name });
                if (details.role) detailRows.push({ label: "Role", value: details.role });
                if (details.amount !== undefined) detailRows.push({ label: "Amount", value: `${details.currency === "RMB" ? "¥" : "৳"}${details.amount}` });
                if (details.amount_from) detailRows.push({ label: "From", value: `${details.from === "BDT" ? "৳" : "¥"}${details.amount_from}` });
                if (details.amount_to) detailRows.push({ label: "To", value: `${details.to === "BDT" ? "৳" : "¥"}${details.amount_to}` });
                if (details.rate) detailRows.push({ label: "Rate", value: `1 RMB = ${details.rate} BDT` });
                if (details.bdt_equivalent) detailRows.push({ label: "BDT Equivalent", value: `৳${Number(details.bdt_equivalent).toFixed(0)}` });
                if (details.buying_cost_rmb) detailRows.push({ label: "Buy Cost", value: `¥${details.buying_cost_rmb}/unit` });
                if (details.shipping_method) detailRows.push({ label: "Shipping", value: details.shipping_method });
                if (details.total_landed_cost) detailRows.push({ label: "Landed Cost", value: `৳${details.total_landed_cost}` });
                if (details.landed_per_unit) detailRows.push({ label: "Per Unit", value: `৳${details.landed_per_unit}` });
                if (details.title) detailRows.push({ label: "Title", value: details.title });
                if (details.phone) detailRows.push({ label: "Phone", value: details.phone });
                if (details.address) detailRows.push({ label: "Address", value: details.address });
                if (details.shop_name) detailRows.push({ label: "Shop", value: details.shop_name });
                if (details.old_amount !== undefined) detailRows.push({ label: "Previous", value: `${details.old_currency === "RMB" ? "¥" : "৳"}${details.old_amount}` });
                if (details.new_amount !== undefined) detailRows.push({ label: "Updated", value: `${details.new_currency === "RMB" ? "¥" : "৳"}${details.new_amount}` });

                const isExpanded = expandedActivity === act.id;

                return (
                  <div key={act.id} className="transition-colors hover:bg-muted/30">
                    <button
                      onClick={() => setExpandedActivity(isExpanded ? null : act.id)}
                      className="w-full p-3 flex items-center gap-3 text-left"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${match.color}`}>
                        <span className="material-symbols-outlined text-[18px]">{match.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{act.action}</p>
                        {!isExpanded && subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
                        <p className="text-[10px] text-muted-foreground">{format(new Date(act.created_at), "MMM d, h:mm a")}</p>
                      </div>
                      <span className={`material-symbols-outlined text-muted-foreground text-[18px] shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                        expand_more
                      </span>
                    </button>
                    {isExpanded && detailRows.length > 0 && (
                      <div className="px-3 pb-3 ml-11 animate-in slide-in-from-top-1 duration-200">
                        <div className="bg-muted rounded-lg p-3 space-y-1.5">
                          {detailRows.map((row, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
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
    </>
  );
};

export default Index;
