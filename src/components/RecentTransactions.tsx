const RecentTransactions = () => {
  return (
    <div className="bg-card rounded-xl border-2 border-dashed border-border min-h-[200px] lg:min-h-[300px] flex flex-col items-center justify-center text-center p-6 lg:p-12">
      <div className="w-14 h-14 lg:w-20 lg:h-20 bg-muted rounded-full flex items-center justify-center mb-3 lg:mb-4">
        <span className="material-symbols-outlined text-3xl lg:text-4xl text-muted-foreground/40">history</span>
      </div>
      <h4 className="text-base lg:text-lg font-semibold text-foreground">No activity yet</h4>
      <p className="text-muted-foreground max-w-sm mt-1.5 lg:mt-2 text-xs lg:text-sm">
        When you start recording sales, stock additions or payments, they will appear here.
      </p>
      <button className="mt-4 lg:mt-6 px-5 lg:px-6 py-2 border border-border rounded-lg text-xs lg:text-sm font-semibold hover:bg-muted transition-colors">
        Learn more
      </button>
    </div>
  );
};

export default RecentTransactions;
