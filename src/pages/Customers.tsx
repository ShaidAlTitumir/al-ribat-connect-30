import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format } from "date-fns";

const Customers = () => {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [ledger, setLedger] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    if (!businessId) return;
    fetchCustomers();
  }, [businessId]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from("customers").select("*")
      .eq("business_id", businessId!).order("name");
    setCustomers(data || []);
  };

  useEffect(() => {
    if (!selectedCustomerId) { setLedger([]); return; }
    supabase.from("customer_ledger").select("*")
      .eq("customer_id", selectedCustomerId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setLedger(data || []));
  }, [selectedCustomerId]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const totalReceivables = customers.reduce((sum, c) => sum + (c.total_due || 0), 0);

  const handleCollect = async () => {
    if (!businessId || !user || !selectedCustomerId || !amount) return;
    const amt = parseFloat(amount);
    if (amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (selectedCustomer && amt > selectedCustomer.total_due) { toast.error("Amount exceeds due"); return; }

    setSaving(true);
    try {
      // Reduce customer due
      await supabase.from("customers")
        .update({ total_due: (selectedCustomer?.total_due || 0) - amt })
        .eq("id", selectedCustomerId);

      // Add ledger entry
      await supabase.from("customer_ledger").insert({
        customer_id: selectedCustomerId, transaction_type: "payment", amount: amt,
        business_id: businessId, user_id: user.id,
      });

      await supabase.from("activity_log").insert({
        action: "Collected due payment", details: { customer: selectedCustomer?.name, amount: amt },
        business_id: businessId, user_id: user.id,
      });

      toast.success(`৳${amt} collected from ${selectedCustomer?.name}`);
      setAmount("");
      fetchCustomers();
      // Refresh ledger
      const { data } = await supabase.from("customer_ledger").select("*")
        .eq("customer_id", selectedCustomerId).order("created_at", { ascending: false });
      setLedger(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!businessId || !user || !newName.trim()) { toast.error("Enter customer name"); return; }
    try {
      await supabase.from("customers").insert({
        name: newName.trim(), phone: newPhone.trim() || null, total_due: 0,
        business_id: businessId, user_id: user.id,
      });
      toast.success("Customer added!");
      setNewName(""); setNewPhone(""); setShowAddCustomer(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Customers" />
      <div className="p-4 lg:p-8 max-w-6xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Customer List + Collect */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search + Add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">search</span>
                <input className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground"
                  placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button onClick={() => setShowAddCustomer(!showAddCustomer)}
                className="bg-primary text-primary-foreground px-3 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>

            {/* Add Customer Form */}
            {showAddCustomer && (
              <div className="bg-card p-4 rounded-xl border border-border space-y-3">
                <Input placeholder="Customer name" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-muted" />
                <Input placeholder="Phone (optional)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="bg-muted" />
                <Button onClick={handleAddCustomer} className="w-full bg-primary text-primary-foreground font-bold">Add Customer</Button>
              </div>
            )}

            {/* Customer List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filtered.map((c) => (
                <button key={c.id} onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedCustomerId === c.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"
                  }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-sm">{c.name}</p>
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                    </div>
                    {c.total_due > 0 && (
                      <span className="text-sm font-bold text-destructive">৳{c.total_due}</span>
                    )}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No customers found</p>
              )}
            </div>

            {/* Collect Due */}
            {selectedCustomer && selectedCustomer.total_due > 0 && (
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
                  Collect from {selectedCustomer.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Current due: <span className="font-bold text-destructive">৳{selectedCustomer.total_due}</span></p>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Amount" value={amount}
                    onChange={(e) => setAmount(e.target.value)} className="bg-muted flex-1" />
                  <Button onClick={handleCollect} disabled={saving} className="bg-primary text-primary-foreground font-bold">
                    {saving ? "..." : "Collect"}
                  </Button>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Total Receivables</p>
                <p className="text-xl font-black mt-1">৳{totalReceivables.toFixed(0)}</p>
              </div>
              <div className="bg-muted p-3 rounded-xl border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Customers</p>
                <p className="text-xl font-black mt-1">{customers.length}</p>
              </div>
            </div>
          </div>

          {/* Right: Ledger */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border border-border min-h-[400px] flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {selectedCustomer ? `${selectedCustomer.name}'s Ledger` : "Customer Ledger"}
                </h3>
              </div>
              {!selectedCustomerId ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-muted-foreground/40 mb-3">person_search</span>
                  <h4 className="font-bold">Select a customer</h4>
                  <p className="text-muted-foreground text-sm mt-1">Choose a customer to view their transaction history.</p>
                </div>
              ) : ledger.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-muted-foreground/40 mb-3">receipt_long</span>
                  <h4 className="font-bold">No transactions yet</h4>
                  <p className="text-muted-foreground text-sm mt-1">This customer has no transaction history.</p>
                </div>
              ) : (
                <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
                  {ledger.map((entry) => (
                    <div key={entry.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          entry.transaction_type === "payment" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                        }`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {entry.transaction_type === "payment" ? "arrow_downward" : "arrow_upward"}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm capitalize">{entry.transaction_type}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}</p>
                        </div>
                      </div>
                      <span className={`font-bold ${entry.transaction_type === "payment" ? "text-emerald-600" : "text-destructive"}`}>
                        {entry.transaction_type === "payment" ? "-" : "+"}৳{entry.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Customers;
