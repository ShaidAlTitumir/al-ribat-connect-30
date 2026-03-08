import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Customers = () => {
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <>
      {/* Header */}
      <header className="h-16 border-b border-border bg-card sticky top-0 z-10 flex items-center justify-between px-8">
        <h2 className="text-2xl font-black tracking-tight">Collect Due</h2>
        <div className="flex items-center gap-4">
          <button className="p-2 text-muted-foreground hover:bg-muted rounded-full">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-8 max-w-6xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border shadow-card p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">payments</span>
                New Collection
              </h3>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Select Customer</label>
                  <div className="relative">
                    <select
                      className="w-full h-12 bg-muted border-border rounded-lg px-4 text-sm focus:ring-primary focus:border-primary appearance-none"
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                    >
                      <option value="">Choose a customer from the list</option>
                      <option value="1">Acme Corp</option>
                      <option value="2">Global Industries</option>
                      <option value="3">Stark Enterprises</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <span className="material-symbols-outlined">expand_more</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Collected Amount</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</div>
                    <Input
                      className="pl-8 h-12 bg-muted border-border"
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>
                <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20" type="submit">
                  <span className="material-symbols-outlined mr-1">add_card</span>
                  Collect
                </Button>
              </form>
            </div>
          </div>

          {/* Ledger Table Section */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden flex flex-col min-h-[400px]">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold">Customer Ledger</h3>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                    <span className="material-symbols-outlined">filter_list</span>
                  </button>
                  <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                    <span className="material-symbols-outlined">download</span>
                  </button>
                </div>
              </div>
              {/* Empty State */}
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="size-24 bg-muted rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-muted-foreground/40 text-5xl">person_search</span>
                </div>
                <h4 className="text-xl font-bold">No customer yet</h4>
                <p className="text-muted-foreground max-w-xs mt-2">
                  Search for a customer or select one from the dropdown to view their transaction history and dues.
                </p>
                <button className="mt-8 px-6 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors">
                  Add New Customer
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Total Receivables</p>
                <p className="text-2xl font-black mt-1">$0.00</p>
              </div>
              <div className="bg-muted p-4 rounded-xl border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Collected Today</p>
                <p className="text-2xl font-black mt-1">$0.00</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Customers;
