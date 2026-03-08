import { useState } from "react";

const Partners = () => {
  const [currency, setCurrency] = useState<"BDT" | "RMB">("BDT");

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-8 sticky top-0 z-10">
        <h2 className="text-2xl font-black tracking-tight text-foreground">Partners</h2>
        <span className="text-sm font-medium text-muted-foreground">Manage partner profiles &amp; profit shares</span>
      </header>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Partner */}
          <section className="bg-card p-6 rounded-xl shadow-card border border-border">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-emerald-500">person_add</span>
              <h3 className="font-bold text-lg text-foreground">Add Partner</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Partner Name</label>
                  <input className="w-full bg-muted border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm text-foreground" placeholder="e.g. John Doe" type="text" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</label>
                  <input className="w-full bg-muted border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm text-foreground" placeholder="e.g. Director" type="text" />
                </div>
              </div>
              <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Register Partner
              </button>
            </div>
          </section>

          {/* Add Capital */}
          <section className="bg-card p-6 rounded-xl shadow-card border border-border">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">account_balance</span>
              <h3 className="font-bold text-lg text-foreground">Add Capital</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Partner</label>
                <select className="w-full bg-muted border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all text-sm appearance-none text-foreground">
                  <option>Select a registered partner</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</label>
                  <input className="w-full bg-muted border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 transition-all text-sm text-foreground" placeholder="0.00" type="number" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Currency</label>
                  <div className="flex bg-muted rounded-lg p-1">
                    <button onClick={() => setCurrency("BDT")} className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${currency === "BDT" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}>BDT</button>
                    <button onClick={() => setCurrency("RMB")} className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${currency === "RMB" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}>RMB</button>
                  </div>
                </div>
              </div>
              <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">add_card</span>
                Inject Capital
              </button>
            </div>
          </section>

          {/* Invite Partner */}
          <section className="bg-card p-6 rounded-xl shadow-card border border-border flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">mail</span>
                <h3 className="font-bold text-lg text-foreground">Invite Partner</h3>
              </div>
              <button className="text-xs font-bold text-primary hover:underline">View All Invites</button>
            </div>
            <div className="bg-primary/5 border border-dashed border-primary/30 rounded-xl p-6 mb-6 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-muted-foreground mb-4">Generate a secure invitation link for a new partner to join the workspace.</p>
              <div className="flex w-full gap-2">
                <div className="flex-1 bg-card px-4 py-2 rounded-lg border border-border text-sm font-mono flex items-center justify-between">
                  <span className="text-muted-foreground italic">No code generated</span>
                  <span className="material-symbols-outlined text-sm text-muted-foreground/50">content_copy</span>
                </div>
                <button className="bg-primary px-6 py-2 rounded-lg text-primary-foreground font-bold text-sm">Generate</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Pending Invitations</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm text-muted-foreground italic">
                  No pending invitations
                </div>
              </div>
            </div>
          </section>

          {/* Partner Equity */}
          <section className="bg-card p-6 rounded-xl shadow-card border border-border flex flex-col min-h-[400px]">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-purple-500">pie_chart</span>
              <h3 className="font-bold text-lg text-foreground">Partner Equity</h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-muted-foreground/50">monitoring</span>
              </div>
              <h4 className="font-bold text-foreground mb-2">No Equity Data Available</h4>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Register partners and add capital to start tracking equity distribution across your project.
              </p>
              <div className="mt-6 flex gap-3">
                <button className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-bold">Import CSV</button>
                <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold">Learn More</button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {[
            { label: "Total Partners", value: "0", icon: "group", bg: "bg-blue-50 dark:bg-blue-900/20", iconColor: "text-blue-600" },
            { label: "Total Capital", value: "৳ 0", icon: "payments", bg: "bg-emerald-50 dark:bg-emerald-900/20", iconColor: "text-emerald-600" },
            { label: "Equity Tracked", value: "0%", icon: "verified", bg: "bg-purple-50 dark:bg-purple-900/20", iconColor: "text-purple-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center ${stat.iconColor}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">{stat.label}</p>
                <p className="text-xl font-black text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Partners;
