import { useNavigate } from "react-router-dom";
import KPICard from "@/components/KPICard";
import RecentTransactions from "@/components/RecentTransactions";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";

const quickActions = [
  { icon: "point_of_sale", label: "Record Sale", path: "/sales" },
  { icon: "add_box", label: "Add Stock", path: "/inventory" },
  { icon: "payments", label: "Exchange Money", path: "/wallet" },
  { icon: "assignment_return", label: "Collect Due", path: "/customers" },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <>
      <ExchangeRateHeader title="Dashboard" />

      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
        {/* Business Snapshot */}
        <section>
          <h3 className="text-base lg:text-lg font-bold mb-3 lg:mb-4">Business Snapshot</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            <KPICard
              title="Wallet Value"
              value="$12,450"
              icon="account_balance_wallet"
              iconColor="text-blue-600 bg-blue-50"
              trend={{ value: "+2.5%", positive: true }}
            />
            <KPICard
              title="Inventory Cost"
              value="$8,200"
              icon="inventory_2"
              iconColor="text-purple-600 bg-purple-50"
            />
            <KPICard
              title="Customer Dues"
              value="$1,150"
              icon="person_search"
              iconColor="text-amber-600 bg-amber-50"
              trend={{ value: "-1.2%", positive: false }}
            />
            <KPICard
              title="Net Profit"
              value="$24,300"
              icon="trending_up"
              iconColor="text-emerald-600 bg-emerald-50"
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h3 className="text-base lg:text-lg font-bold mb-3 lg:mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center justify-center p-5 lg:p-8 bg-card rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-muted rounded-full flex items-center justify-center mb-2 lg:mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <span className="material-symbols-outlined text-[20px] lg:text-[24px]">{action.icon}</span>
                </div>
                <span className="text-xs lg:text-sm font-bold">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h3 className="text-base lg:text-lg font-bold mb-3 lg:mb-4">Recent Activity</h3>
          <RecentTransactions />
        </section>
      </div>
    </>
  );
};

export default Index;
