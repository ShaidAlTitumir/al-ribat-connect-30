const partners = [
  { name: "Partner A", share: 40, profit: "৳1,24,000", color: "bg-primary" },
  { name: "Partner B", share: 35, profit: "৳1,08,500", color: "bg-info" },
  { name: "Partner C", share: 25, profit: "৳77,500", color: "bg-success" },
];

const PartnerSplit = () => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-sm font-bold text-foreground mb-4">Profit Distribution</h3>

      {/* Bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full mb-5">
        {partners.map((p) => (
          <div
            key={p.name}
            className={`${p.color} transition-all duration-500`}
            style={{ width: `${p.share}%` }}
          />
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {partners.map((p) => (
          <div key={p.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`h-2.5 w-2.5 rounded-full ${p.color}`} />
              <span className="text-sm font-medium text-foreground">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.share}%</span>
            </div>
            <span className="text-sm font-bold text-foreground">{p.profit}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartnerSplit;
