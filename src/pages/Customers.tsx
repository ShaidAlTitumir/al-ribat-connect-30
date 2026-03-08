import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import InvoiceModal from "@/components/InvoiceModal";
import BulkInvoiceModal from "@/components/BulkInvoiceModal";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Phone, MapPin, Store, Edit2, Trash2, X, Check } from "lucide-react";

const Customers = () => {
  const { businessId, businessName, businessPhone, businessAddress } = useBusiness();
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
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [showBulkInvoice, setShowBulkInvoice] = useState(false);

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
    if (!selectedCustomerId) { setLedger([]); setPurchaseHistory([]); return; }
    supabase.from("customer_ledger").select("*")
      .eq("customer_id", selectedCustomerId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setLedger(data || []));
    supabase.from("sales").select("*, inventory_items(name)")
      .eq("customer_id", selectedCustomerId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPurchaseHistory(data || []));
  }, [selectedCustomerId]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const totalReceivables = customers.reduce((sum, c) => sum + (c.total_due || 0), 0);
  const customersWithDue = customers.filter(c => (c.total_due || 0) > 0).length;

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setExpandedId(expandedId === id ? null : id);
    setMobileView("detail");
  };

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
        name: newName.trim(), phone: newPhone.trim(), total_due: 0,
        business_id: businessId, user_id: user.id,
        address: newAddress.trim() || null, shop_name: newShopName.trim() || null,
      } as any);
      await supabase.from("activity_log").insert({
        action: "Added new customer",
        details: { customer_name: newName.trim(), phone: newPhone.trim() },
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
    setEditForm({ name: c.name || "", phone: c.phone || "", address: c.address || "", shop_name: c.shop_name || "" });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editForm.name.trim()) { toast.error("Name is required"); return; }
    if (!editForm.phone.trim()) { toast.error("Phone is required"); return; }
    const { error } = await (supabase.from("customers") as any)
      .update({ name: editForm.name.trim(), phone: editForm.phone.trim(), address: editForm.address.trim() || null, shop_name: editForm.shop_name.trim() || null })
      .eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Customer updated!");
    setEditingId(null);
    fetchCustomers();
  };

  const handleDelete = async (c: any) => {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    if (selectedCustomerId === c.id) { setSelectedCustomerId(""); setMobileView("list"); }
    if (businessId && user) {
      await supabase.from("activity_log").insert({
        action: "Deleted customer", details: { customer_name: c.name },
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
      <div className="p-3 lg:p-8 max-w-6xl w-full mx-auto flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left: Customer List */}
          <div className={`lg:col-span-1 space-y-3 ${mobileView !== "list" ? "hidden lg:block" : ""}`}>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-primary/5 p-2.5 rounded-xl border border-primary/10">
                <p className="text-[9px] font-bold text-primary uppercase">Receivable</p>
                <p className="text-base font-black mt-0.5">৳{totalReceivables.toFixed(0)}</p>
              </div>
              <div className="bg-muted p-2.5 rounded-xl border border-border">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Total</p>
                <p className="text-base font-black mt-0.5">{customers.length}</p>
              </div>
              <div className="bg-destructive/5 p-2.5 rounded-xl border border-destructive/10">
                <p className="text-[9px] font-bold text-destructive uppercase">With Due</p>
                <p className="text-base font-black mt-0.5">{customersWithDue}</p>
              </div>
            </div>

            {/* Search + Add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px]">search</span>
                <input className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground"
                  placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button onClick={() => setShowAddCustomer(!showAddCustomer)}
                className="bg-primary text-primary-foreground px-3 rounded-lg active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[18px]">{showAddCustomer ? "close" : "add"}</span>
              </button>
            </div>

            {/* Add Customer Form */}
            {showAddCustomer && (
              <div className="bg-card p-3 rounded-xl border border-border space-y-2">
                <h4 className="font-bold text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-sm">person_add</span> New Customer
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Name *" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-muted h-9 text-sm" />
                  <Input placeholder="Phone *" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="bg-muted h-9 text-sm" />
                  <Input placeholder="Shop name" value={newShopName} onChange={(e) => setNewShopName(e.target.value)} className="bg-muted h-9 text-sm" />
                  <Input placeholder="Address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="bg-muted h-9 text-sm" />
                </div>
                <Button onClick={handleAddCustomer} className="w-full bg-primary text-primary-foreground font-bold h-9 text-sm">Add Customer</Button>
              </div>
            )}

            {/* Customer List */}
            <div className="space-y-1.5 max-h-[60vh] lg:max-h-[400px] overflow-y-auto">
              {filtered.map((c) => (
                <div key={c.id} className={`rounded-lg border overflow-hidden transition-colors ${
                  selectedCustomerId === c.id ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}>
                  {editingId === c.id ? (
                    <div className="p-2.5 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Name *" value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-muted text-xs h-8" />
                        <Input placeholder="Phone *" value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="bg-muted text-xs h-8" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEdit} size="sm" className="flex-1 bg-primary text-primary-foreground font-bold h-7 text-[10px]">
                          <Check className="w-3 h-3 mr-0.5" /> Save
                        </Button>
                        <Button onClick={() => setEditingId(null)} size="sm" variant="outline" className="flex-1 h-7 text-[10px]">
                          <X className="w-3 h-3 mr-0.5" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="w-full text-left p-2.5 active:bg-muted/50 transition-colors"
                      onClick={() => handleSelectCustomer(c.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {c.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {c.phone}{c.shop_name ? ` · ${c.shop_name}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {(c.total_due || 0) > 0 ? (
                            <span className="text-xs font-bold text-destructive">৳{c.total_due}</span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-600">Paid</span>
                          )}
                          <span className="material-symbols-outlined text-muted-foreground text-[16px]">chevron_right</span>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">No customers found</p>
              )}
            </div>

            {/* Collect Due */}
            {selectedCustomer && selectedCustomer.total_due > 0 && (
              <div className="bg-card rounded-xl border border-border p-3">
                <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[16px]">payments</span>
                  Collect from {selectedCustomer.name}
                </h3>
                <p className="text-[10px] text-muted-foreground mb-2">Due: <span className="font-bold text-destructive">৳{selectedCustomer.total_due}</span></p>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Amount" value={amount}
                    onChange={(e) => setAmount(e.target.value)} className="bg-muted flex-1 h-9 text-sm" />
                  <Button onClick={handleCollect} disabled={saving} className="bg-primary text-primary-foreground font-bold h-9 text-sm">
                    {saving ? "..." : "Collect"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Customer Detail */}
          <div className={`lg:col-span-2 ${mobileView !== "detail" ? "hidden lg:block" : ""}`}>
            {/* Mobile back button */}
            {mobileView === "detail" && (
              <button onClick={() => { setMobileView("list"); setSelectedCustomerId(""); }}
                className="lg:hidden flex items-center gap-1 text-xs font-medium text-muted-foreground mb-3 active:scale-95">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to list
              </button>
            )}

            <div className="bg-card rounded-xl border border-border min-h-[300px] flex flex-col">
              <div className="p-3 lg:p-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm lg:text-lg font-bold">
                    {selectedCustomer ? selectedCustomer.name : "Customer Details"}
                  </h3>
                  {selectedCustomer && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${(selectedCustomer.total_due || 0) > 0 ? "text-destructive" : "text-emerald-600"}`}>
                        Due: ৳{(selectedCustomer.total_due || 0).toFixed(0)}
                      </span>
                      <button onClick={() => setShowBulkInvoice(true)} disabled={purchaseHistory.length === 0}
                        title="Bulk Invoice"
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/10 text-primary active:scale-95 disabled:opacity-40">
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                      </button>
                      <button onClick={() => handleStartEdit(selectedCustomer)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground active:scale-95">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(selectedCustomer)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground active:scale-95">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {selectedCustomer && (
                  <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
                    {(["ledger", "purchases"] as const).map((t) => (
                      <button key={t} onClick={() => setActiveTab(t)}
                        className={`flex-1 py-1.5 text-[10px] lg:text-xs font-bold rounded-md transition-colors ${
                          activeTab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                        }`}>
                        {t === "ledger" ? `Ledger (${ledger.length})` : `Purchases (${purchaseHistory.length})`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!selectedCustomerId ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <span className="material-symbols-outlined text-3xl text-muted-foreground/40 mb-2">person_search</span>
                  <h4 className="font-bold text-sm">Select a customer</h4>
                  <p className="text-muted-foreground text-xs mt-1">Choose a customer to view details.</p>
                </div>
              ) : activeTab === "ledger" ? (
                ledger.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <span className="material-symbols-outlined text-3xl text-muted-foreground/40 mb-2">receipt_long</span>
                    <h4 className="font-bold text-sm">No transactions yet</h4>
                  </div>
                ) : (
                  <div className="divide-y divide-border overflow-y-auto max-h-[400px] lg:max-h-[500px]">
                    {ledger.map((entry) => (
                      <div key={entry.id} className="p-2.5 lg:p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            entry.transaction_type === "payment" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            <span className="material-symbols-outlined text-[16px]">
                              {entry.transaction_type === "payment" ? "arrow_downward" : "arrow_upward"}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-xs capitalize">{entry.transaction_type}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(entry.created_at), "MMM d, h:mm a")}</p>
                          </div>
                        </div>
                        <span className={`font-bold text-xs ${entry.transaction_type === "payment" ? "text-emerald-600" : "text-destructive"}`}>
                          {entry.transaction_type === "payment" ? "-" : "+"}৳{entry.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                purchaseHistory.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <span className="material-symbols-outlined text-3xl text-muted-foreground/40 mb-2">shopping_bag</span>
                    <h4 className="font-bold text-sm">No purchases yet</h4>
                  </div>
                ) : (
                  <div className="divide-y divide-border overflow-y-auto max-h-[400px] lg:max-h-[500px]">
                    {purchaseHistory.map((sale) => (
                      <div key={sale.id} className="p-2.5 lg:p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                          </div>
                          <div>
                            <p className="font-semibold text-xs">{sale.inventory_items?.name || "Item"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {sale.quantity} × ৳{sale.unit_price_bdt} · {format(new Date(sale.created_at), "MMM d")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="text-right">
                            <p className="font-bold text-xs">৳{(sale.quantity * sale.unit_price_bdt).toFixed(0)}</p>
                            {sale.due > 0 && <p className="text-[10px] text-destructive">Due: ৳{sale.due}</p>}
                            {sale.due === 0 && <p className="text-[10px] text-emerald-600">Paid</p>}
                          </div>
                          <button
                            onClick={() => setInvoiceData({
                              sale, itemName: sale.inventory_items?.name || "Item",
                              customerName: selectedCustomer?.name || "Customer",
                              business: { name: businessName, phone: businessPhone, address: businessAddress },
                            })}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground active:scale-95">
                            <span className="material-symbols-outlined text-[16px]">receipt</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="p-2.5 bg-muted/50">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Purchases</span>
                        <span className="font-bold">৳{purchaseHistory.reduce((s, p) => s + p.quantity * p.unit_price_bdt, 0).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
      <InvoiceModal data={invoiceData} onClose={() => setInvoiceData(null)} />
      <BulkInvoiceModal
        open={showBulkInvoice}
        onClose={() => setShowBulkInvoice(false)}
        customerName={selectedCustomer?.name || "Customer"}
        business={{ name: businessName, phone: businessPhone, address: businessAddress }}
        sales={purchaseHistory}
      />
    </div>
  );
};

export default Customers;
