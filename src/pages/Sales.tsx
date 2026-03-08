import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import InvoiceModal from "@/components/InvoiceModal";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/exportUtils";

const Sales = () => {
  const { businessId, exchangeRate, businessName, businessPhone, businessAddress } = useBusiness();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const [editingSale, setEditingSale] = useState<any>(null);
  const [editForm, setEditForm] = useState({ quantity: 0, unit_price_bdt: 0, received_now_bdt: 0 });
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);

  const [items, setItems] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [landedCost, setLandedCost] = useState(0);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [businessInfo, setBusinessInfo] = useState<any>({});
  const [mobileTab, setMobileTab] = useState<"form" | "history">("form");

  const refreshData = async () => {
    if (!businessId) return;
    const [itemsRes, allItemsRes, custRes, salesRes, bizRes] = await Promise.all([
      supabase.from("inventory_items").select("*").eq("business_id", businessId).gt("current_stock", 0),
      supabase.from("inventory_items").select("*").eq("business_id", businessId),
      supabase.from("customers").select("*").eq("business_id", businessId),
      supabase.from("sales").select("*, inventory_items(name), customers(name)")
        .eq("business_id", businessId).order("created_at", { ascending: false }).limit(10),
      supabase.from("businesses").select("name, phone, address").eq("id", businessId).single(),
    ]);
    setItems(itemsRes.data || []);
    setAllItems(allItemsRes.data || []);
    setCustomers(custRes.data || []);
    setRecentSales(salesRes.data || []);
    setBusinessInfo(bizRes.data || {});
  };

  useEffect(() => { refreshData(); }, [businessId]);

  useEffect(() => {
    if (!selectedItemId || !businessId) { setLandedCost(0); return; }
    supabase.from("purchase_transactions").select("landed_cost_per_unit_bdt")
      .eq("item_id", selectedItemId).eq("business_id", businessId)
      .order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        setLandedCost(data?.[0]?.landed_cost_per_unit_bdt || 0);
      });
    const item = items.find((i) => i.id === selectedItemId);
    if (item?.default_selling_price) setUnitPrice(String(item.default_selling_price));
  }, [selectedItemId, items]);

  const total = quantity * (parseFloat(unitPrice) || 0);
  const due = total - (parseFloat(receivedAmount) || 0);
  const profit = ((parseFloat(unitPrice) || 0) - landedCost) * quantity;
  const selectedItem = items.find((i) => i.id === selectedItemId);

  const handleSave = async () => {
    if (!businessId || !user) return;
    if (!selectedItemId) { toast.error("Select an item"); return; }
    if (quantity <= 0) { toast.error("Quantity must be > 0"); return; }
    if (!unitPrice) { toast.error("Enter unit price"); return; }

    const item = items.find((i) => i.id === selectedItemId);
    if (item && quantity > item.current_stock) { toast.error(`Only ${item.current_stock} in stock`); return; }

    setSaving(true);
    try {
      let custId = selectedCustomerId || null;

      if (showNewCustomer && newCustomerName.trim()) {
        const { data: newCust, error } = await supabase.from("customers").insert({
          name: newCustomerName.trim(), phone: newCustomerPhone.trim() || null,
          total_due: 0, business_id: businessId, user_id: user.id,
        }).select().single();
        if (error) throw error;
        custId = newCust.id;
      }

      const dueAmount = Math.max(0, due);

      const { data: sale, error: saleError } = await supabase.from("sales").insert({
        item_id: selectedItemId, quantity, unit_price_bdt: parseFloat(unitPrice),
        received_now_bdt: parseFloat(receivedAmount) || 0, due: dueAmount,
        expected_profit: profit, customer_id: custId, cost_rate: landedCost,
        business_id: businessId, user_id: user.id,
      }).select().single();
      if (saleError) throw saleError;

      const newStock = (item?.current_stock || 0) - quantity;
      await supabase.from("inventory_items")
        .update({ current_stock: newStock })
        .eq("id", selectedItemId);

      const threshold = item?.low_stock_threshold ?? 5;
      if (newStock > 0 && newStock <= threshold) {
        await supabase.from("notifications").insert({
          user_id: user.id, business_id: businessId,
          title: "Low Stock Alert",
          message: `${item?.name} is running low — only ${newStock} left (threshold: ${threshold})`,
          type: "low_stock",
        } as any);
      } else if (newStock === 0) {
        await supabase.from("notifications").insert({
          user_id: user.id, business_id: businessId,
          title: "Out of Stock",
          message: `${item?.name} is now out of stock. Consider restocking.`,
          type: "low_stock",
        } as any);
      }

      if (custId && dueAmount > 0) {
        const cust = customers.find((c) => c.id === custId);
        await supabase.from("customers")
          .update({ total_due: (cust?.total_due || 0) + dueAmount })
          .eq("id", custId);
        await supabase.from("customer_ledger").insert({
          customer_id: custId, transaction_type: "sale", amount: dueAmount,
          reference_id: sale.id, business_id: businessId, user_id: user.id,
        });
      }

      const custName = custId ? (customers.find(c => c.id === custId)?.name || newCustomerName || "Walk-in") : "Walk-in";
      await supabase.from("activity_log").insert({
        action: "Recorded sale", details: { 
          item_name: item?.name, quantity, total, 
          unit_price: parseFloat(unitPrice), 
          received: parseFloat(receivedAmount) || 0,
          due: Math.max(0, due),
          customer_name: custName,
          profit 
        },
        business_id: businessId, user_id: user.id,
      });

      toast.success("Sale recorded!");
      setSelectedItemId(""); setQuantity(1); setUnitPrice(""); setReceivedAmount("");
      setSelectedCustomerId(""); setNewCustomerName(""); setNewCustomerPhone(""); setShowNewCustomer(false);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save sale");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sale: any) => {
    if (!businessId || !user) return;
    setDeletingSaleId(sale.id);
    try {
      const item = allItems.find((i) => i.id === sale.item_id);
      if (item) {
        await supabase.from("inventory_items")
          .update({ current_stock: item.current_stock + sale.quantity })
          .eq("id", sale.item_id);
      }
      if (sale.customer_id && sale.due > 0) {
        const cust = customers.find((c) => c.id === sale.customer_id);
        if (cust) {
          await supabase.from("customers")
            .update({ total_due: Math.max(0, (cust.total_due || 0) - sale.due) })
            .eq("id", sale.customer_id);
        }
        await supabase.from("customer_ledger").delete()
          .eq("reference_id", sale.id).eq("business_id", businessId);
      }
      await supabase.from("sales").delete().eq("id", sale.id);
      await supabase.from("activity_log").insert({
        action: "Deleted sale", details: {
          item_name: (sale as any).inventory_items?.name,
          quantity: sale.quantity, total: sale.quantity * sale.unit_price_bdt,
        },
        business_id: businessId, user_id: user.id,
      });
      toast.success("Sale deleted and stock restored");
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingSaleId(null);
    }
  };

  const startEdit = (sale: any) => {
    setEditingSale(sale);
    setEditForm({
      quantity: sale.quantity,
      unit_price_bdt: sale.unit_price_bdt,
      received_now_bdt: sale.received_now_bdt,
    });
  };

  const handleEditSave = async () => {
    if (!editingSale || !businessId || !user) return;
    setSaving(true);
    try {
      const sale = editingSale;
      const oldQty = sale.quantity;
      const oldDue = sale.due;
      const newTotal = editForm.quantity * editForm.unit_price_bdt;
      const newDue = Math.max(0, newTotal - editForm.received_now_bdt);
      const qtyDiff = editForm.quantity - oldQty;
      const dueDiff = newDue - oldDue;

      if (qtyDiff !== 0) {
        const item = allItems.find((i) => i.id === sale.item_id);
        if (item) {
          const newStock = item.current_stock - qtyDiff;
          if (newStock < 0) { toast.error("Not enough stock"); setSaving(false); return; }
          await supabase.from("inventory_items")
            .update({ current_stock: newStock })
            .eq("id", sale.item_id);
        }
      }

      if (sale.customer_id && dueDiff !== 0) {
        const cust = customers.find((c) => c.id === sale.customer_id);
        if (cust) {
          await supabase.from("customers")
            .update({ total_due: Math.max(0, (cust.total_due || 0) + dueDiff) })
            .eq("id", sale.customer_id);
        }
      }

      await supabase.from("sales").update({
        quantity: editForm.quantity,
        unit_price_bdt: editForm.unit_price_bdt,
        received_now_bdt: editForm.received_now_bdt,
        due: newDue,
        expected_profit: (editForm.unit_price_bdt - (sale.cost_rate || 0)) * editForm.quantity,
      }).eq("id", sale.id);

      await supabase.from("activity_log").insert({
        action: "Edited sale", details: {
          item_name: (sale as any).inventory_items?.name,
          old_quantity: oldQty, new_quantity: editForm.quantity,
          old_due: oldDue, new_due: newDue,
        },
        business_id: businessId, user_id: user.id,
      });

      toast.success("Sale updated!");
      setEditingSale(null);
      await refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Record Sale" />
      
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex bg-card border-b border-border">
        {(["form", "history"] as const).map((tab) => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-xs font-bold text-center transition-colors ${
              mobileTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}>
            {tab === "form" ? "New Sale" : `History (${recentSales.length})`}
          </button>
        ))}
      </div>

      <div className="p-3 lg:p-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Sale Form */}
          <div className={`lg:col-span-2 space-y-3 lg:space-y-5 ${mobileTab !== "form" ? "hidden lg:block" : ""}`}>
            
            {/* Item Selection & Pricing — single card */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 pt-4 pb-2 lg:px-6 lg:pt-5 lg:pb-3 border-b border-border">
                <h3 className="text-xs lg:text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="w-5 h-5 lg:w-6 lg:h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[14px] lg:text-[16px]">shopping_basket</span>
                  </span>
                  Item & Pricing
                </h3>
              </div>
              <div className="p-4 lg:p-6 space-y-3">
                {/* Item Select */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Item</label>
                  <select className="w-full h-10 lg:h-11 bg-muted border border-border rounded-lg px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
                    value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                    <option value="">Choose item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} (Stock: {item.current_stock})</option>
                    ))}
                  </select>
                  {selectedItem && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Available: <span className="font-bold text-foreground">{selectedItem.current_stock}</span>
                      {landedCost > 0 && <> • Cost: <span className="font-bold text-foreground">৳{landedCost.toFixed(2)}</span>/unit</>}
                    </p>
                  )}
                </div>

                {/* Quantity & Unit Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Quantity</label>
                    <input type="number" value={quantity} min={1}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      className="w-full h-10 lg:h-11 bg-muted border border-border rounded-lg px-3 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Unit Price (৳)</label>
                    <input type="number" placeholder="0.00" value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full h-10 lg:h-11 bg-muted border border-border rounded-lg px-3 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-shadow" />
                  </div>
                </div>

                {/* Total & Received */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Total</label>
                    <div className="w-full h-10 lg:h-11 bg-primary/5 border border-primary/20 rounded-lg px-3 flex items-center text-sm font-black text-foreground">
                      ৳{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Received (৳)</label>
                    <input type="number" placeholder="Paid now" value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="w-full h-10 lg:h-11 bg-muted border border-border rounded-lg px-3 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-shadow" />
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Selection */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 pt-4 pb-2 lg:px-6 lg:pt-5 lg:pb-3 border-b border-border">
                <h3 className="text-xs lg:text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="w-5 h-5 lg:w-6 lg:h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[14px] lg:text-[16px]">person</span>
                  </span>
                  Customer
                  <span className="text-[10px] font-normal text-muted-foreground">(optional)</span>
                </h3>
              </div>
              <div className="p-4 lg:p-6">
                {!showNewCustomer ? (
                  <div className="space-y-2">
                    <select className="w-full h-10 lg:h-11 bg-muted border border-border rounded-lg px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
                      value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                      <option value="">Walk-in customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} {c.total_due > 0 ? `(Due: ৳${c.total_due})` : ""}</option>
                      ))}
                    </select>
                    <button onClick={() => setShowNewCustomer(true)}
                      className="text-primary text-[11px] font-semibold hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">add</span> Add new customer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Name</label>
                        <input type="text" placeholder="Full name" value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          className="w-full h-10 bg-muted border border-border rounded-lg px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Phone</label>
                        <input type="tel" placeholder="Phone" value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                          className="w-full h-10 bg-muted border border-border rounded-lg px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none" />
                      </div>
                    </div>
                    <button onClick={() => { setShowNewCustomer(false); setNewCustomerName(""); setNewCustomerPhone(""); }}
                      className="text-muted-foreground text-[11px] hover:text-foreground transition-colors">← Back to customer list</button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: Summary + Save */}
            <div className="lg:hidden rounded-xl overflow-hidden">
              <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Amount</span>
                  <span className="text-lg font-black text-foreground">৳{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Amount Due</span>
                  <span className={`text-sm font-bold ${due > 0 ? "text-destructive" : "text-foreground"}`}>৳{Math.max(0, due).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span> Profit
                  </span>
                  <span className={`text-sm font-bold ${profit > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                    ৳{profit > 0 ? profit.toFixed(2) : "0.00"}
                  </span>
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="w-full mt-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {saving ? "Saving..." : "Confirm Sale"}
                </button>
              </div>
            </div>

          </div>

          {/* Recent Sales — desktop: inside grid; mobile: history tab */}
          <div className={`lg:col-span-2 ${mobileTab !== "history" ? "hidden lg:block" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs lg:text-sm font-bold text-foreground">Recent Sales</h3>
                {recentSales.length > 0 && (
                  <button onClick={() => exportToCSV(recentSales.map(s => ({
                    Item: (s as any).inventory_items?.name || "Item",
                    Quantity: s.quantity, "Unit Price": s.unit_price_bdt,
                    Total: s.quantity * s.unit_price_bdt, Received: s.received_now_bdt,
                    Due: s.due, Customer: (s as any).customers?.name || "Walk-in",
                    Date: format(new Date(s.created_at), "yyyy-MM-dd"),
                  })), "sales-export", { name: businessName, phone: businessPhone, address: businessAddress })}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] lg:text-xs font-bold text-muted-foreground hover:text-foreground bg-muted rounded-lg border border-border transition-colors">
                    <span className="material-symbols-outlined text-[14px]">download</span> Export
                  </button>
                )}
              </div>
              {recentSales.length === 0 ? (
                <div className="bg-card border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center text-center">
                  <span className="material-symbols-outlined text-3xl text-muted-foreground/50 mb-2">receipt_long</span>
                  <p className="font-bold text-sm text-foreground">No sales yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Your sales will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/20 transition-colors">
                      {editingSale?.id === sale.id ? (
                        <div className="p-3 lg:p-4 space-y-3">
                          <p className="font-bold text-xs text-foreground">{(sale as any).inventory_items?.name || "Item"}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-muted-foreground uppercase">Qty</label>
                              <input type="number" min={1} value={editForm.quantity}
                                onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                                className="w-full h-8 bg-muted border border-border rounded-lg px-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/20 outline-none" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-muted-foreground uppercase">Price</label>
                              <input type="number" value={editForm.unit_price_bdt}
                                onChange={(e) => setEditForm({ ...editForm, unit_price_bdt: parseFloat(e.target.value) || 0 })}
                                className="w-full h-8 bg-muted border border-border rounded-lg px-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/20 outline-none" />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-muted-foreground uppercase">Received</label>
                              <input type="number" value={editForm.received_now_bdt}
                                onChange={(e) => setEditForm({ ...editForm, received_now_bdt: parseFloat(e.target.value) || 0 })}
                                className="w-full h-8 bg-muted border border-border rounded-lg px-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/20 outline-none" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setEditingSale(null)} className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleEditSave} disabled={saving}
                              className="px-3 py-1.5 text-[11px] font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                              {saving ? "..." : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 lg:p-4 flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs lg:text-sm text-foreground truncate">{(sale as any).inventory_items?.name || "Item"}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] lg:text-xs text-muted-foreground">
                                {sale.quantity} × ৳{sale.unit_price_bdt}
                              </span>
                              <span className="text-[10px] text-muted-foreground/40">•</span>
                              <span className="text-[10px] lg:text-xs text-muted-foreground truncate">
                                {(sale as any).customers?.name || "Walk-in"}
                              </span>
                            </div>
                            <p className="text-[9px] lg:text-[10px] text-muted-foreground/60 mt-0.5">
                              {format(new Date(sale.created_at), "MMM d, h:mm a")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-sm lg:text-base text-foreground">৳{(sale.quantity * sale.unit_price_bdt).toLocaleString()}</p>
                            {sale.due > 0 && (
                              <p className="text-[10px] font-semibold text-destructive">Due: ৳{sale.due}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => startEdit(sale)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground active:scale-95 transition-all">
                              <span className="material-symbols-outlined text-[15px]">edit</span>
                            </button>
                            <button onClick={() => setInvoiceData({
                                sale, itemName: (sale as any).inventory_items?.name || "Item",
                                customerName: (sale as any).customers?.name || "Walk-in", business: businessInfo,
                              })}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground active:scale-95 transition-all">
                              <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                            </button>
                            <button onClick={() => handleDelete(sale)} disabled={deletingSaleId === sale.id}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground active:scale-95 disabled:opacity-50 transition-all">
                              <span className="material-symbols-outlined text-[15px]">
                                {deletingSaleId === sale.id ? "hourglass_empty" : "delete"}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Desktop Summary Sidebar */}
          <div className="hidden lg:block">
            <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-24">
              <div className="bg-primary/5 px-6 py-4 border-b border-border">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Sale Summary</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="text-xl font-black text-foreground">৳{total.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Received</span>
                  <span className="text-sm font-bold text-foreground">৳{(parseFloat(receivedAmount) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount Due</span>
                  <span className={`text-lg font-black ${due > 0 ? "text-destructive" : "text-foreground"}`}>
                    ৳{Math.max(0, due).toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-muted-foreground">trending_up</span>
                      <span className="text-sm font-medium text-muted-foreground">Est. Profit</span>
                    </div>
                    <span className={`text-lg font-black ${profit > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                      ৳{profit > 0 ? profit.toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6">
                <button onClick={handleSave} disabled={saving}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {saving ? "Saving..." : "Confirm Sale"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <InvoiceModal data={invoiceData} onClose={() => setInvoiceData(null)} />
    </div>
  );
};

export default Sales;
