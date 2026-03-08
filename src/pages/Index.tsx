import KPICard from "@/components/KPICard";
import RecentTransactions from "@/components/RecentTransactions";

const quickActions = [
  { icon: "point_of_sale", label: "Record Sale" },
  { icon: "add_box", label: "Add Stock" },
  { icon: "payments", label: "Exchange Money" },
  { icon: "assignment_return", label: "Collect Due" },
];

const Index = () => {
  return (
    <>
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm font-semibold hover:bg-muted/80 transition-colors">
            <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
            <span>Exchange rate 16</span>
          </button>
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Business Snapshot */}
        <section>
          <h3 className="text-lg font-bold mb-4">Business Snapshot</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Wallet Value"
              value="$12,450.00"
              icon="account_balance_wallet"
              iconColor="text-blue-600 bg-blue-50"
              trend={{ value: "+2.5%", positive: true }}
            />
            <KPICard
              title="Inventory Cost"
              value="$8,200.00"
              icon="inventory_2"
              iconColor="text-purple-600 bg-purple-50"
            />
            <KPICard
              title="Customer Dues"
              value="$1,150.00"
              icon="person_search"
              iconColor="text-amber-600 bg-amber-50"
              trend={{ value: "-1.2%", positive: false }}
            />
            <KPICard
              title="Net Profit"
              value="$24,300.00"
              icon="trending_up"
              iconColor="text-emerald-600 bg-emerald-50"
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="flex flex-col items-center justify-center p-8 bg-card rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <span className="material-symbols-outlined">{action.icon}</span>
                </div>
                <span className="text-sm font-bold">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
          <RecentTransactions />
        </section>
      </div>
    </>
  );
};

export default Index;
