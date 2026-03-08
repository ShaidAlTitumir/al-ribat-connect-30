import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format } from "date-fns";

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

  useEffect(() => {
    if (!businessId) return;
    fetchDashboard();
  }, [businessId, exchangeRate]);

  const fetchDashboard = async () => {
    // Fetch all data in parallel
    const [capsRes, salesRes, paymentsRes, expsRes, purchasesRes, invRes, custsRes, exchRes, partnersRes, actsRes] = await Promise.all([
      supabase.from("capital_contributions").select("amount, currency, partner_id").eq("business_id", businessId!),
      supabase.from("sales").select("received_now_bdt, expected_profit, unit_price_bdt, quantity").eq("business_id", businessId!),
      supabase.from("customer_ledger").select("amount").eq("business_id", businessId!).eq("transaction_type", "payment"),
      supabase.from("expenses").select("amount, currency").eq("business_id", businessId!),
      supabase.from("purchase_transactions").select("total_landed_cost_bdt").eq("business_id", businessId!),
      supabase.from("inventory_items").select("id, current_stock").eq("business_id", businessId!),
      supabase.from("customers").select("total_due").eq("business_id", businessId!),
      supabase.from("exchanges").select("*").eq("business_id", businessId!),
      supabase.from("partners").select("id, name, status").eq("business_id", businessId!),
      supabase.from("activity_log").select("*").eq("business_id", businessId!).order("created_at", { ascending: false }).limit(15),
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
    purchases.forEach((p) => { bdt -= p.total_landed_cost_bdt; });
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

        {/* Partner Equity */}
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
                  "Collected due payment": { icon: "receipt", color: "text-emerald-600 bg-emerald-50" },
                  "Added new customer": { icon: "person_add", color: "text-blue-600 bg-blue-50" },
                  "Deleted customer": { icon: "person_remove", color: "text-red-600 bg-red-50" },
                  "Added new partner": { icon: "group_add", color: "text-primary bg-primary/10" },
                  "Removed partner": { icon: "group_remove", color: "text-red-600 bg-red-50" },
                };
                const match = iconMap[act.action] || { icon: "bolt", color: "text-primary bg-primary/10" };
                const details = act.details || {};
                let subtitle = "";
                if (details.item_name) subtitle += details.item_name;
                if (details.quantity) subtitle += ` × ${details.quantity}`;
                if (details.customer_name) subtitle += details.customer_name;
                if (details.partner_name) subtitle += details.partner_name;
                if (details.title) subtitle += details.title;
                if (details.amount) subtitle += ` • ${details.currency === "RMB" ? "¥" : "৳"}${details.amount}`;
                if (details.total) subtitle += ` • ৳${details.total}`;
                return (
                  <div key={act.id} className="p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${match.color}`}>
                      <span className="material-symbols-outlined text-[18px]">{match.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{act.action}</p>
                      {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
                      <p className="text-[10px] text-muted-foreground">{format(new Date(act.created_at), "MMM d, h:mm a")}</p>
                    </div>
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
