const RecentTransactions = () => {
  return (
    <div className="bg-card rounded-xl border-2 border-dashed border-border min-h-[300px] flex flex-col items-center justify-center text-center p-12">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-4xl text-muted-foreground/40">history</span>
      </div>
      <h4 className="text-lg font-semibold text-foreground">No activity yet</h4>
      <p className="text-muted-foreground max-w-sm mt-2 text-sm">
        When you start recording sales, stock additions or payments, they will appear here as a chronological list.
      </p>
      <button className="mt-6 px-6 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
        Learn more about tracking
      </button>
    </div>
  );
};

export default RecentTransactions;
