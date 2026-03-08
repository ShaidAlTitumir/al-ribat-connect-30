import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/exportUtils";

const Expenses = () => {
  const { businessId, exchangeRate, businessName, businessPhone, businessAddress } = useBusiness();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", amount: "", category: "Shipping" });
  const [currency, setCurrency] = useState<"BDT" | "RMB">("BDT");
  const [useManualRate, setUseManualRate] = useState(false);
  const [manualRate, setManualRate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    fetchExpenses();
  }, [businessId]);

  const fetchExpenses = async () => {
    const { data } = await supabase.from("expenses").select("*")
      .eq("business_id", businessId!).order("created_at", { ascending: false });
    setExpenses(data || []);
  };

  // Monthly total
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTotal = expenses
    .filter((e) => new Date(e.created_at) >= monthStart)
    .reduce((sum, e) => sum + (e.currency === "BDT" ? e.amount : 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !user) return;
    if (!form.title.trim()) { toast.error("Enter expense title"); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setSaving(true);
    const activeRate = useManualRate && manualRate ? parseFloat(manualRate) : exchangeRate;
    const bdtEquivalent = currency === "RMB" ? amt * activeRate : amt;
    try {
      await supabase.from("expenses").insert({
        title: form.title.trim(), amount: amt, currency, category: form.category,
        business_id: businessId, user_id: user.id,
      });
      await supabase.from("activity_log").insert({
        action: "Added expense",
        details: {
          title: form.title, amount: amt, currency,
          ...(currency === "RMB" ? { rate: activeRate, bdt_equivalent: bdtEquivalent } : {}),
        },
        business_id: businessId, user_id: user.id,
      });
      toast.success("Expense saved!");
      setForm({ title: "", amount: "", category: "Shipping" });
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const exp = expenses.find(e => e.id === id);
      await supabase.from("expenses").delete().eq("id", id);
      if (businessId && user && exp) {
        await supabase.from("activity_log").insert({
          action: "Deleted expense",
          details: { title: exp.title, amount: exp.amount, currency: exp.currency },
          business_id: businessId, user_id: user.id,
        });
      }
      toast.success("Expense deleted");
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Expenses" />
      <div className="p-4 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-4">
              {/* Monthly Total */}
              <div className="bg-primary rounded-xl p-4 lg:p-6 text-primary-foreground shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-primary-foreground/80 text-sm font-medium">Total Spent This Month</p>
                  <h3 className="text-3xl font-bold mt-1">৳{monthlyTotal.toFixed(0)}</h3>
                </div>
                <div className="absolute -right-6 -bottom-6 opacity-20">
                  <span className="material-symbols-outlined text-[100px]">payments</span>
                </div>
              </div>

              {/* Add Expense */}
              <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">add</span>
                  </div>
                  <h3 className="text-lg font-bold">Add New Expense</h3>
                </div>
                <form className="space-y-3" onSubmit={handleSave}>
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <Input placeholder="e.g. Customs Duty" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-muted" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Amount</label>
                      <Input placeholder="0.00" type="number" value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-muted" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Currency</label>
                      <div className="flex p-1 bg-muted rounded-lg">
                        {(["BDT", "RMB"] as const).map((c) => (
                          <button key={c} type="button" onClick={() => setCurrency(c)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md ${currency === c ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                            {c}
                          </button>
                        ))}
                    </div>
                  </div>
                  {currency === "RMB" && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium">RMB Rate</label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs text-muted-foreground">Manual</span>
                          <button type="button" onClick={() => setUseManualRate(!useManualRate)}
                            className={`relative w-9 h-5 rounded-full transition-colors ${useManualRate ? "bg-primary" : "bg-muted border border-border"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${useManualRate ? "translate-x-4" : ""}`} />
                          </button>
                        </label>
                      </div>
                      {useManualRate ? (
                        <Input type="number" step="0.01" placeholder="Enter rate" value={manualRate}
                          onChange={(e) => setManualRate(e.target.value)} className="bg-muted" />
                      ) : (
                        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                          {exchangeRate} BDT/RMB (default)
                        </div>
                      )}
                      {form.amount && (
                        <p className="text-xs text-muted-foreground mt-1">
                          = ৳{((parseFloat(form.amount) || 0) * (useManualRate && manualRate ? parseFloat(manualRate) : exchangeRate)).toFixed(2)} BDT
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select className="w-full px-4 py-2 rounded-lg border border-border bg-muted text-sm text-foreground"
                      value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      <option>Shipping</option><option>Customs Duty</option><option>Operations</option>
                      <option>Transport</option><option>Office Supplies</option><option>Other</option>
                    </select>
                  </div>
                  <Button disabled={saving} className="w-full bg-primary text-primary-foreground font-bold h-11" type="submit">
                    <span className="material-symbols-outlined text-xl mr-1">save</span>
                    {saving ? "Saving..." : "Save Expense"}
                  </Button>
                </form>
              </div>
            </div>

            {/* Right: History */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-xl border border-border h-full flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-lg font-bold">Expense History</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground">{expenses.length} records</span>
                    {expenses.length > 0 && (
                      <button onClick={() => exportToCSV(expenses.map(e => ({
                        Title: e.title, Amount: e.amount, Currency: e.currency,
                        Category: e.category || "Other",
                        Date: format(new Date(e.created_at), "yyyy-MM-dd"),
                      })), "expenses-export", { name: businessName, phone: businessPhone, address: businessAddress })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted rounded-lg border border-border">
                        <span className="material-symbols-outlined text-[16px]">download</span> Export
                      </button>
                    )}
                  </div>
                </div>
                {expenses.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-muted-foreground/40 mb-3">receipt</span>
                    <h4 className="font-bold">No expenses yet</h4>
                    <p className="text-muted-foreground text-sm mt-1">Add your first expense to see it here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border overflow-y-auto max-h-[600px]">
                    {expenses.map((exp) => (
                      <div key={exp.id} className="p-3 flex items-center justify-between hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{exp.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {exp.category} • {format(new Date(exp.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm text-destructive">
                            {exp.currency === "BDT" ? "৳" : "¥"}{exp.amount}
                          </span>
                          <button onClick={() => handleDelete(exp.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
