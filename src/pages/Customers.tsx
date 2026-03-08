import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Phone, MapPin, Store, Edit2, Trash2, X, Check } from "lucide-react";

const Customers = () => {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [ledger, setLedger] = useState<any[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"ledger" | "purchases">("ledger");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newShopName, setNewShopName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "", shop_name: "" });

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
  const customersWithDue = customers.filter(c => (c.total_due || 0) > 0).length;

  const handleCollect = async () => {
    if (!businessId || !user || !selectedCustomerId || !amount) return;
    const amt = parseFloat(amount);
    if (amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (selectedCustomer && amt > selectedCustomer.total_due) { toast.error("Amount exceeds due"); return; }

    setSaving(true);
    try {
      await supabase.from("customers")
        .update({ total_due: (selectedCustomer?.total_due || 0) - amt })
        .eq("id", selectedCustomerId);

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
    if (!businessId || !user) return;
    if (!newName.trim()) { toast.error("Customer name is required"); return; }
    if (!newPhone.trim()) { toast.error("Phone number is required"); return; }
    try {
      await supabase.from("customers").insert({
        name: newName.trim(),
        phone: newPhone.trim(),
        total_due: 0,
        business_id: businessId,
        user_id: user.id,
        address: newAddress.trim() || null,
        shop_name: newShopName.trim() || null,
      } as any);
      await supabase.from("activity_log").insert({
        action: "Added new customer",
        details: { customer_name: newName.trim(), phone: newPhone.trim(), address: newAddress.trim() || null, shop_name: newShopName.trim() || null },
        business_id: businessId, user_id: user.id,
      });
      toast.success("Customer added!");
      setNewName(""); setNewPhone(""); setNewAddress(""); setNewShopName("");
      setShowAddCustomer(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStartEdit = (c: any) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name || "",
      phone: c.phone || "",
      address: c.address || "",
      shop_name: c.shop_name || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editForm.name.trim()) { toast.error("Name is required"); return; }
    if (!editForm.phone.trim()) { toast.error("Phone is required"); return; }
    const { error } = await (supabase.from("customers") as any)
      .update({
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim() || null,
        shop_name: editForm.shop_name.trim() || null,
      })
      .eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Customer updated!");
    setEditingId(null);
    fetchCustomers();
  };

  const handleDelete = async (c: any) => {
    if (!window.confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    if (selectedCustomerId === c.id) setSelectedCustomerId("");
    if (businessId && user) {
      await supabase.from("activity_log").insert({
        action: "Deleted customer",
        details: { customer_name: c.name },
        business_id: businessId, user_id: user.id,
      });
    }
    toast.success(`${c.name} deleted`);
    fetchCustomers();
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.shop_name && c.shop_name.toLowerCase().includes(search.toLowerCase()))
  );

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
                  placeholder="Search name, phone, shop..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button onClick={() => setShowAddCustomer(!showAddCustomer)}
                className="bg-primary text-primary-foreground px-3 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">{showAddCustomer ? "close" : "add"}</span>
              </button>
            </div>

            {/* Add Customer Form */}
            {showAddCustomer && (
              <div className="bg-card p-4 rounded-xl border border-border space-y-3">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">person_add</span>
                  New Customer
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Name *</label>
                    <Input placeholder="Customer name" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-muted mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Phone *</label>
                    <Input placeholder="Phone number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="bg-muted mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Shop Name</label>
                    <Input placeholder="Shop / business name" value={newShopName} onChange={(e) => setNewShopName(e.target.value)} className="bg-muted mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Address</label>
                    <Input placeholder="Address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="bg-muted mt-1" />
                  </div>
                </div>
                <Button onClick={handleAddCustomer} className="w-full bg-primary text-primary-foreground font-bold">Add Customer</Button>
              </div>
            )}

            {/* Customer List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filtered.map((c) => (
                <div key={c.id} className={`rounded-lg border overflow-hidden transition-colors ${
                  selectedCustomerId === c.id ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}>
                  {editingId === c.id ? (
                    <div className="p-3 space-y-2">
                      <Input placeholder="Name *" value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-muted text-sm h-8" />
                      <Input placeholder="Phone *" value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="bg-muted text-sm h-8" />
                      <Input placeholder="Shop name" value={editForm.shop_name}
                        onChange={(e) => setEditForm({ ...editForm, shop_name: e.target.value })} className="bg-muted text-sm h-8" />
                      <Input placeholder="Address" value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-muted text-sm h-8" />
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEdit} size="sm" className="flex-1 bg-primary text-primary-foreground font-bold h-8">
                          <Check className="w-3.5 h-3.5 mr-1" /> Save
                        </Button>
                        <Button onClick={() => setEditingId(null)} size="sm" variant="outline" className="flex-1 h-8">
                          <X className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="w-full text-left p-3"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setExpandedId(expandedId === c.id ? null : c.id);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {c.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{c.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {c.phone && <span>{c.phone}</span>}
                                {c.shop_name && <span>· {c.shop_name}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {(c.total_due || 0) > 0 ? (
                              <span className="text-sm font-bold text-destructive">৳{c.total_due}</span>
                            ) : (
                              <span className="text-xs font-medium text-emerald-600">Paid</span>
                            )}
                            {expandedId === c.id ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </button>
                      {expandedId === c.id && (
                        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                          <div className="space-y-1.5">
                            {c.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="w-3.5 h-3.5 shrink-0" /> <span>{c.phone}</span>
                              </div>
                            )}
                            {c.shop_name && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Store className="w-3.5 h-3.5 shrink-0" /> <span>{c.shop_name}</span>
                              </div>
                            )}
                            {c.address && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5 shrink-0" /> <span>{c.address}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <span className="material-symbols-outlined text-sm text-muted-foreground">receipt</span>
                              <span className="text-muted-foreground">Due:</span>
                              <span className={`font-bold ${(c.total_due || 0) > 0 ? "text-destructive" : "text-emerald-600"}`}>
                                ৳{(c.total_due || 0).toFixed(0)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Added {format(new Date(c.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <button onClick={(e) => { e.stopPropagation(); handleStartEdit(c); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-accent text-foreground text-xs font-bold hover:bg-accent/80 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Receivables</p>
                <p className="text-lg font-black mt-1">৳{totalReceivables.toFixed(0)}</p>
              </div>
              <div className="bg-muted p-3 rounded-xl border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customers</p>
                <p className="text-lg font-black mt-1">{customers.length}</p>
              </div>
              <div className="bg-destructive/5 p-3 rounded-xl border border-destructive/10">
                <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">With Due</p>
                <p className="text-lg font-black mt-1">{customersWithDue}</p>
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
                {selectedCustomer && (
                  <span className={`text-sm font-bold ${(selectedCustomer.total_due || 0) > 0 ? "text-destructive" : "text-emerald-600"}`}>
                    Due: ৳{(selectedCustomer.total_due || 0).toFixed(0)}
                  </span>
                )}
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
