import { Package, ShoppingCart, Receipt, TrendingUp } from "lucide-react";
import KPICard from "@/components/KPICard";
import PartnerSplit from "@/components/PartnerSplit";
import RecentTransactions from "@/components/RecentTransactions";
import CurrencyWidget from "@/components/CurrencyWidget";

const Index = () => {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back — here's your business overview
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Total Inventory"
          value="৳8,45,000"
          subtitle="¥54,166 RMB equivalent"
          icon={Package}
          trend={{ value: "12%", positive: true }}
          variant="navy"
        />
        <KPICard
          title="Monthly Sales"
          value="৳3,10,000"
          subtitle="42 orders this month"
          icon={ShoppingCart}
          trend={{ value: "8%", positive: true }}
        />
        <KPICard
          title="Total Expenses"
          value="৳1,25,000"
          subtitle="Shipping, customs, ops"
          icon={Receipt}
          trend={{ value: "3%", positive: false }}
        />
        <KPICard
          title="Net Profit"
          value="৳3,10,000"
          subtitle="Shared among 3 partners"
          icon={TrendingUp}
          trend={{ value: "15%", positive: true }}
          variant="gold"
        />
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentTransactions />
        </div>
        <div className="space-y-4">
          <PartnerSplit />
          <CurrencyWidget />
        </div>
      </div>
    </div>
  );
};

export default Index;
