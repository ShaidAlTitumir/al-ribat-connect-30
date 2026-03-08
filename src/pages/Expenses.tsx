import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Expenses = () => {
  const [form, setForm] = useState({ title: "", amount: "", category: "Food & Dining" });

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Expenses</h2>
            <p className="text-muted-foreground mt-1">Track and manage your daily expenditures.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg font-medium shadow-card hover:bg-muted transition-colors">
              <span className="material-symbols-outlined text-xl">file_download</span>
              Export
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Total Spent Summary */}
            <div className="bg-primary rounded-xl p-6 text-primary-foreground shadow-lg shadow-primary/20 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-primary-foreground/80 text-sm font-medium">Total Spent This Month</p>
                <h3 className="text-4xl font-bold mt-2">$3,450.00</h3>
                <div className="mt-4 flex items-center gap-2 bg-primary-foreground/10 w-fit px-3 py-1 rounded-full text-xs">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  <span>12% from last month</span>
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-20 transform rotate-12">
                <span className="material-symbols-outlined text-[120px]">payments</span>
              </div>
            </div>

            {/* Add Expense Card */}
            <div className="bg-card rounded-xl shadow-card border border-border p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">add</span>
                </div>
                <h3 className="text-lg font-bold">Add New Expense</h3>
              </div>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Expense Title</label>
                  <Input
                    placeholder="e.g. Grocery Shopping"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Amount</label>
                    <Input
                      placeholder="0.00"
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="bg-muted border-border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Currency</label>
                    <div className="flex p-1 bg-muted rounded-lg">
                      <button className="flex-1 py-1.5 text-xs font-bold rounded-md bg-card shadow-sm" type="button">BDT</button>
                      <button className="flex-1 py-1.5 text-xs font-medium text-muted-foreground" type="button">RMB</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                  <select
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-muted focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none text-sm"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option>Shipping</option>
                    <option>Customs Duty</option>
                    <option>Operations</option>
                    <option>Transport</option>
                    <option>Office Supplies</option>
                    <option>Other</option>
                  </select>
                </div>
                <Button className="w-full bg-primary text-primary-foreground font-bold py-3 h-12 shadow-lg shadow-primary/30 hover:bg-primary/90" type="submit">
                  <span className="material-symbols-outlined text-xl mr-1">save</span>
                  Save Expense
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column: Expense History */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl shadow-card border border-border h-full flex flex-col">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold">Expense History</h3>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Recent Transactions</span>
              </div>
              {/* Empty State */}
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-muted-foreground/40 text-5xl">receipt</span>
                </div>
                <h4 className="text-xl font-bold mb-2">No expenses yet</h4>
                <p className="text-muted-foreground max-w-xs mx-auto mb-8">
                  Start tracking your finances by adding your first expense using the form on the left.
                </p>
              </div>
              <div className="p-4 bg-muted/50 border-t border-border">
                <p className="text-xs text-center text-muted-foreground font-medium italic">
                  Your expense data is encrypted and secure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
