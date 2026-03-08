import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

const transactions = [
  { id: 1, desc: "Sold 500 pcs LED Bulbs", amount: "৳45,000", type: "income", date: "Mar 7" },
  { id: 2, desc: "Shipping from Guangzhou", amount: "¥2,800", type: "expense", date: "Mar 6" },
  { id: 3, desc: "Sold 200 pcs Phone Cases", amount: "৳18,000", type: "income", date: "Mar 5" },
  { id: 4, desc: "Customs Duty Payment", amount: "৳12,500", type: "expense", date: "Mar 4" },
  { id: 5, desc: "Sold 1000 pcs USB Cables", amount: "৳65,000", type: "income", date: "Mar 3" },
];

const RecentTransactions = () => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground">Recent Transactions</h3>
        <button className="text-xs font-semibold text-gold hover:text-gold-dark transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-3">
        {transactions.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  t.type === "income"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {t.type === "income" ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t.desc}</p>
                <p className="text-xs text-muted-foreground">{t.date}</p>
              </div>
            </div>
            <span
              className={`text-sm font-bold ${
                t.type === "income" ? "text-success" : "text-destructive"
              }`}
            >
              {t.type === "income" ? "+" : "-"}{t.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTransactions;
