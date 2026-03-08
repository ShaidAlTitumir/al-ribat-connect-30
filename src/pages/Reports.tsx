import { useState } from "react";

const Reports = () => {
  const [period, setPeriod] = useState("month");

  const metrics = [
    { label: "Total Sales", value: "$0.00", change: "+0%", up: true, icon: "trending_up", iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400", barColor: "bg-primary", barWidth: "0%" },
    { label: "Gross Profit", value: "$0.00", change: "0%", up: true, icon: "payments", iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-400", barColor: "bg-emerald-500", barWidth: "0%" },
    { label: "Outstanding Dues", value: "$0.00", change: "0%", up: false, icon: "pending_actions", iconBg: "bg-orange-100 dark:bg-orange-900/30", iconColor: "text-orange-600 dark:text-orange-400", barColor: "bg-orange-500", barWidth: "0%" },
    { label: "Net Profit", value: "$0.00", change: "0%", up: true, icon: "account_balance_wallet", iconBg: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600 dark:text-purple-400", barColor: "bg-purple-500", barWidth: "0%" },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-8 sticky top-0 z-10 shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Reports</h2>
        <div className="flex items-center gap-3">
          <button className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
            <span className="material-symbols-outlined">calendar_today</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Title */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <h3 className="text-3xl font-black tracking-tight mb-2 text-foreground">Detailed Reports</h3>
              <p className="text-muted-foreground">Comprehensive overview of your organizational performance and metrics.</p>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-sm">download</span>
              Export PDF
            </button>
          </div>

          {/* Period Tabs */}
          <div className="border-b border-border flex gap-8">
            {["week", "month", "year", "custom"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`pb-3 text-sm font-bold transition-colors ${
                  period === p ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {p === "custom" ? "Custom Range" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Performance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.map((m) => (
              <div key={m.label} className="bg-card p-6 rounded-xl border border-border shadow-card">
                <div className="flex justify-between items-start mb-4">
                  <span className={`material-symbols-outlined p-2 rounded-lg ${m.iconBg} ${m.iconColor}`}>{m.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MTD Performance</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{m.label}</p>
                <div className="flex items-baseline gap-3 mt-1">
                  <h4 className="text-3xl font-bold text-foreground">{m.value}</h4>
                  <span className={`text-xs font-bold flex items-center ${m.up ? "text-emerald-500" : "text-destructive"}`}>
                    {m.change}
                    <span className="material-symbols-outlined text-xs">{m.up ? "arrow_upward" : "arrow_downward"}</span>
                  </span>
                </div>
                <div className="mt-4 w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div className={`${m.barColor} h-full rounded-full`} style={{ width: m.barWidth }} />
                </div>
              </div>
            ))}
          </div>

          {/* Partner Profit Share */}
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h5 className="text-lg font-bold text-foreground">Partner Profit Share</h5>
                <p className="text-xs text-muted-foreground">Distribution of profits across active business partners.</p>
              </div>
              <button className="text-xs font-bold text-primary hover:underline">View All Details</button>
            </div>
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6 border border-dashed border-border">
                <span className="material-symbols-outlined text-4xl text-muted-foreground/50">pie_chart</span>
              </div>
              <h6 className="text-base font-bold text-foreground">No partner data available for this month</h6>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">
                To see profit distribution, ensure all partner agreements are active and transactions are categorized.
              </p>
              <button className="mt-6 border border-border hover:bg-muted px-6 py-2 rounded-lg text-sm font-bold transition-colors text-foreground">
                Manage Partners
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
