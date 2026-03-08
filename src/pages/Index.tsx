import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import KPICard from "@/components/KPICard";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format } from "date-fns";

const quickActions = [
  { icon: "point_of_sale", label: "Record Sale", path: "/sales" },
  { icon: "add_box", label: "Add Stock", path: "/inventory" },
  { icon: "payments", label: "Exchange Money", path: "/wallet" },
  { icon: "assignment_return", label: "Collect Due", path: "/customers" },
];

const Index = () => {
  const navigate = useNavigate();
  const { businessId, exchangeRate } = useBusiness();
  const [kpis, setKpis] = useState({ wallet: 0, inventory: 0, dues: 0, netProfit: 0 });
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!businessId) return;
    fetchDashboard();
  }, [businessId, exchangeRate]);

  const fetchDashboard = async () => {
    // Wallet value: capital + sales received + collections - expenses - purchases + exchange adjustments
    const { data: caps } = await supabase.from("capital_contributions").select("amount, currency").eq("business_id", businessId!);
    let bdt = 0;
    (caps || []).forEach((c) => { bdt += c.currency === "RMB" ? c.amount * exchangeRate : c.amount; });

    const { data: sales } = await supabase.from("sales").select("received_now_bdt, expected_profit, unit_price_bdt, quantity").eq("business_id", businessId!);
    (sales || []).forEach((s) => { bdt += s.received_now_bdt; });

    const { data: payments } = await supabase.from("customer_ledger").select("amount").eq("business_id", businessId!).eq("transaction_type", "payment");
    (payments || []).forEach((p) => { bdt += p.amount; });

    const { data: exps } = await supabase.from("expenses").select("amount, currency").eq("business_id", businessId!);
    (exps || []).forEach((e) => { bdt -= e.currency === "RMB" ? e.amount * exchangeRate : e.amount; });

    const { data: purchases } = await supabase.from("purchase_transactions").select("total_landed_cost_bdt").eq("business_id", businessId!);
    (purchases || []).forEach((p) => { bdt -= p.total_landed_cost_bdt; });

    // Inventory cost
    const { data: invItems } = await supabase.from("inventory_items").select("id, current_stock").eq("business_id", businessId!);
    let inventoryCost = 0;
    if (invItems && invItems.length > 0) {
      for (const item of invItems) {
        const { data: lastPurchase } = await supabase.from("purchase_transactions").select("landed_cost_per_unit_bdt")
          .eq("item_id", item.id).order("created_at", { ascending: false }).limit(1);
        if (lastPurchase?.[0]) inventoryCost += item.current_stock * lastPurchase[0].landed_cost_per_unit_bdt;
      }
    }

    // Customer dues
    const { data: custs } = await supabase.from("customers").select("total_due").eq("business_id", businessId!);
    const totalDues = (custs || []).reduce((s, c) => s + c.total_due, 0);

    // Net profit: total sales revenue - total landed cost of sold items - expenses
    const totalSalesRevenue = (sales || []).reduce((s, r) => s + r.unit_price_bdt * r.quantity, 0);
    const totalExpenses = (exps || []).reduce((s, e) => s + (e.currency === "RMB" ? e.amount * exchangeRate : e.amount), 0);
    const totalProfit = (sales || []).reduce((s, r) => s + r.expected_profit, 0);
    const netProfit = totalProfit - totalExpenses;

    setKpis({ wallet: bdt, inventory: inventoryCost, dues: totalDues, netProfit });

    // Recent activity
    const { data: acts } = await supabase.from("activity_log").select("*")
      .eq("business_id", businessId!).order("created_at", { ascending: false }).limit(5);
    setActivities(acts || []);
  };

  return (
    <>
      <ExchangeRateHeader title="Dashboard" />
      <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Business Snapshot */}
        <section>
          <h3 className="text-base lg:text-lg font-bold mb-3">Business Snapshot</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            <KPICard title="Wallet Value" value={`৳${kpis.wallet.toFixed(0)}`} icon="account_balance_wallet" iconColor="text-blue-600 bg-blue-50" />
            <KPICard title="Inventory Cost" value={`৳${kpis.inventory.toFixed(0)}`} icon="inventory_2" iconColor="text-purple-600 bg-purple-50" />
            <KPICard title="Customer Dues" value={`৳${kpis.dues.toFixed(0)}`} icon="person_search" iconColor="text-amber-600 bg-amber-50" />
            <KPICard title="Net Profit" value={`৳${kpis.netProfit.toFixed(0)}`} icon="trending_up" iconColor="text-emerald-600 bg-emerald-50" />
          </div>
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
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {activities.map((act) => (
                <div key={act.id} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{act.action}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(act.created_at), "MMM d, h:mm a")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default Index;
