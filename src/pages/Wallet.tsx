import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Wallet = () => {
  const [fromAmount, setFromAmount] = useState("1000");
  const rate = 16;
  const toAmount = fromAmount ? (parseFloat(fromAmount) / rate).toFixed(2) : "0.00";

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-8 py-4">
        <h2 className="text-xl font-bold tracking-tight">Wallet</h2>
        <div className="flex items-center gap-6">
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">search</span>
            <input
              className="w-64 rounded-full border-none bg-muted py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Search transactions..."
              type="text"
            />
          </div>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Wallet Overview */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h3 className="text-2xl font-black tracking-tight">Wallet Overview</h3>
              <p className="text-muted-foreground text-sm">Your multi-currency asset balances</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BDT Card */}
            <div className="relative group overflow-hidden rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-card-hover transition-all border-l-4 border-l-primary">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="material-symbols-outlined text-primary">payments</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Default Wallet</span>
              </div>
              <h4 className="text-muted-foreground text-sm font-medium mb-1">BDT Balance</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">৳ 150,000.00</span>
                <span className="text-success text-xs font-bold flex items-center bg-success/10 px-1.5 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span> 2.4%
                </span>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-9xl">currency_lira</span>
              </div>
            </div>

            {/* RMB Card */}
            <div className="relative group overflow-hidden rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-card-hover transition-all border-l-4 border-l-muted-foreground">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-muted rounded-lg">
                  <span className="material-symbols-outlined text-muted-foreground">currency_exchange</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Savings Account</span>
              </div>
              <h4 className="text-muted-foreground text-sm font-medium mb-1">RMB Balance</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">¥ 9,375.00</span>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-9xl">currency_yuan</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Exchange Card */}
          <section className="lg:col-span-2">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-card h-full">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Currency Exchange</h3>
                  <p className="text-muted-foreground text-sm">Convert your assets instantly with zero fees</p>
                </div>
                <div className="bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
                  <p className="text-[10px] uppercase font-bold text-primary tracking-widest">Current Rate</p>
                  <p className="text-sm font-black text-primary">1 BDT = 0.0625 RMB</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* From */}
                <div className="rounded-xl bg-muted p-6 border border-border">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">From</label>
                    <span className="text-xs text-muted-foreground">Balance: ৳ 150,000.00</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-card px-3 py-2 rounded-lg border border-border min-w-[100px]">
                      <span className="font-bold text-sm">BDT</span>
                      <span className="material-symbols-outlined text-sm text-muted-foreground">expand_more</span>
                    </div>
                    <input
                      className="flex-1 bg-transparent border-none text-2xl font-black p-0 focus:ring-0 focus:outline-none placeholder:text-muted-foreground/30"
                      placeholder="0.00"
                      type="number"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center -my-6 relative z-[1]">
                  <button className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-card hover:rotate-180 transition-transform duration-500">
                    <span className="material-symbols-outlined">swap_vert</span>
                  </button>
                </div>

                {/* To */}
                <div className="rounded-xl bg-muted p-6 border border-border">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">To (Estimated)</label>
                    <span className="text-xs text-muted-foreground">Balance: ¥ 9,375.00</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-card px-3 py-2 rounded-lg border border-border min-w-[100px]">
                      <span className="font-bold text-sm">RMB</span>
                      <span className="material-symbols-outlined text-sm text-muted-foreground">expand_more</span>
                    </div>
                    <div className="flex-1 text-2xl font-black text-muted-foreground">{toAmount}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-2 pt-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    <span>Conversion Rate: 1 RMB = {rate} BDT</span>
                  </div>
                  <span className="text-muted-foreground">Fee: <span className="text-success font-bold">Free</span></span>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 h-14 rounded-xl shadow-lg shadow-primary/30 mt-4">
                  <span className="material-symbols-outlined mr-1">sync_alt</span>
                  Exchange Assets
                </Button>
              </div>
            </div>
          </section>

          {/* Recent Exchanges */}
          <section className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-card h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold tracking-tight">Recent Exchanges</h3>
                <button className="text-primary text-xs font-bold hover:underline">View All</button>
              </div>
              {/* Empty State */}
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-muted-foreground/40">receipt_long</span>
                </div>
                <h4 className="font-bold mb-1">No Recent Exchanges</h4>
                <p className="text-muted-foreground text-sm max-w-[180px]">Convert currencies to see your transaction history here.</p>
                <div className="mt-8 w-full border-t border-dashed border-border pt-8">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-4 text-left">Quick Stats</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">Weekly Volume</p>
                      <p className="text-sm font-black">৳ 0</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">Total Saved</p>
                      <p className="text-sm font-black">৳ 0</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Portfolio Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center gap-4">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Market Trend</p>
              <p className="text-sm font-bold">Stable (+0.04%)</p>
            </div>
          </div>
          <div className="bg-muted border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="bg-muted p-2 rounded-lg text-muted-foreground">
              <span className="material-symbols-outlined">security</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Account Status</p>
              <p className="text-sm font-bold text-success flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success" /> Verified
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Wallet;
