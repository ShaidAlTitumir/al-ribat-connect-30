import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import InvoiceModal from "@/components/InvoiceModal";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/exportUtils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);

  const [items, setItems] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [landedCost, setLandedCost] = useState(0);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [businessInfo, setBusinessInfo] = useState<any>({});
  const [mobileTab, setMobileTab] = useState<"form" | "history">("form");
  const [loading, setLoading] = useState(true);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");

  const refreshData = async () => {
    if (!businessId) return;
    setLoading(true);
    const [itemsRes, allItemsRes, custRes, salesRes, bizRes] = await Promise.all([
      supabase.from("inventory_items").select("*").eq("business_id", businessId).gt("current_stock", 0),
      supabase.from("inventory_items").select("*").eq("business_id", businessId),
      supabase.from("customers").select("*").eq("business_id", businessId),
      supabase.from("sales").select("*, inventory_items(name), customers(name)")
        .eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
      supabase.from("businesses").select("name, phone, address").eq("id", businessId).single(),
    ]);
    setItems(itemsRes.data || []);
    setAllItems(allItemsRes.data || []);
    setCustomers(custRes.data || []);
    setRecentSales(salesRes.data || []);
    setBusinessInfo(bizRes.data || {});
    setLoading(false);
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

  // Filtered sales
  const filteredSales = useMemo(() => {
    let filtered = recentSales;

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const start = new Date();
      if (dateFilter === "today") start.setHours(0, 0, 0, 0);
      else if (dateFilter === "week") start.setDate(now.getDate() - 7);
      else if (dateFilter === "month") start.setMonth(now.getMonth() - 1);
      filtered = filtered.filter(s => new Date(s.created_at) >= start);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        ((s as any).inventory_items?.name || "").toLowerCase().includes(q) ||
        ((s as any).customers?.name || "walk-in").toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [recentSales, searchQuery, dateFilter]);

  // Sales summary stats
  const salesStats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.quantity * s.unit_price_bdt, 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + (s.expected_profit || 0), 0);
    const totalDue = filteredSales.reduce((sum, s) => sum + (s.due || 0), 0);
    return { totalRevenue, totalProfit, totalDue, count: filteredSales.length };
  }, [filteredSales]);

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
      setMobileTab("history");
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
    setDeleteConfirm(null);
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

  const dateFilterOptions = [
    { key: "all" as const, label: "All" },
    { key: "today" as const, label: "Today" },
    { key: "week" as const, label: "7 Days" },
    { key: "month" as const, label: "30 Days" },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Record Sale" />

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex bg-card border-b border-border">
        {(["form", "history"] as const).map((tab) => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 py-3 text-xs font-bold text-center transition-all relative ${
              mobileTab === tab ? "text-primary" : "text-muted-foreground"
            }`}>
            <span className="flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">
                {tab === "form" ? "add_shopping_cart" : "receipt_long"}
              </span>
              {tab === "form" ? "New Sale" : `History (${recentSales.length})`}
            </span>
            {mobileTab === tab && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="p-3 lg:p-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Sale Form */}
          <div className={`lg:col-span-2 space-y-3 lg:space-y-5 ${mobileTab !== "form" ? "hidden lg:block" : ""}`}>

            {/* Item Selection & Pricing */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-4 pt-4 pb-2 lg:px-6 lg:pt-5 lg:pb-3 border-b border-border bg-muted/30">
                <h3 className="text-xs lg:text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 lg:w-7 lg:h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[16px] lg:text-[18px]">shopping_basket</span>
                  </span>
                  Item & Pricing
                </h3>
              </div>
              <div className="p-4 lg:p-6 space-y-4">
                {/* Item Select */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Item</label>
                  <select className="w-full h-11 lg:h-12 bg-muted/50 border border-border rounded-xl px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition-all"
                    value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                    <option value="">Choose item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} (Stock: {item.current_stock})</option>
                    ))}
                  </select>
                  {selectedItem && (
                    <div className="flex items-center gap-3 mt-2 px-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-md text-foreground">
                        <span className="material-symbols-outlined text-[12px] text-muted-foreground">inventory_2</span>
                        {selectedItem.current_stock} in stock
                      </span>
                      {landedCost > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary/10 px-2 py-0.5 rounded-md text-primary">
                          <span className="material-symbols-outlined text-[12px]">payments</span>
                          ৳{landedCost.toFixed(2)}/unit cost
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Quantity & Unit Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Quantity</label>
                    <input type="number" value={quantity} min={1}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      className="w-full h-11 lg:h-12 bg-muted/50 border border-border rounded-xl px-3 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Unit Price (৳)</label>
                    <input type="number" placeholder="0.00" value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full h-11 lg:h-12 bg-muted/50 border border-border rounded-xl px-3 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition-all" />
                  </div>
                </div>

                {/* Total & Received */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Total</label>
                    <div className="w-full h-11 lg:h-12 bg-primary/5 border border-primary/20 rounded-xl px-3 flex items-center text-sm font-black text-foreground">
                      ৳{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Received (৳)</label>
                    <input type="number" placeholder="Paid now" value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="w-full h-11 lg:h-12 bg-muted/50 border border-border rounded-xl px-3 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Selection */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="px-4 pt-4 pb-2 lg:px-6 lg:pt-5 lg:pb-3 border-b border-border bg-muted/30">
                <h3 className="text-xs lg:text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 lg:w-7 lg:h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[16px] lg:text-[18px]">person</span>
                  </span>
                  Customer
                  <span className="text-[10px] font-normal text-muted-foreground ml-1 bg-muted px-1.5 py-0.5 rounded">optional</span>
                </h3>
              </div>
              <div className="p-4 lg:p-6">
                {!showNewCustomer ? (
                  <div className="space-y-2.5">
                    <select className="w-full h-11 lg:h-12 bg-muted/50 border border-border rounded-xl px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition-all"
                      value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                      <option value="">Walk-in customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} {c.total_due > 0 ? `(Due: ৳${c.total_due})` : ""}</option>
                      ))}
                    </select>
                    <button onClick={() => setShowNewCustomer(true)}
                      className="text-primary text-[11px] font-semibold hover:underline flex items-center gap-1 px-1">
                      <span className="material-symbols-outlined text-[14px]">person_add</span> Add new customer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Name</label>
                        <input type="text" placeholder="Full name" value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          className="w-full h-11 bg-muted/50 border border-border rounded-xl px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Phone</label>
                        <input type="tel" placeholder="Phone" value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                          className="w-full h-11 bg-muted/50 border border-border rounded-xl px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition-all" />
                      </div>
                    </div>
                    <button onClick={() => { setShowNewCustomer(false); setNewCustomerName(""); setNewCustomerPhone(""); }}
                      className="text-muted-foreground text-[11px] hover:text-foreground transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">arrow_back</span> Back to customer list
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: Summary + Save */}
            <div className="lg:hidden rounded-xl overflow-hidden">
              <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Amount</span>
                  <span className="text-xl font-black text-foreground">৳{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Amount Due</span>
                  <span className={`text-sm font-bold ${due > 0 ? "text-destructive" : "text-foreground"}`}>৳{Math.max(0, due).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span> Est. Profit
                  </span>
                  <span className={`text-sm font-bold ${profit > 0 ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>
                    ৳{profit > 0 ? profit.toFixed(2) : "0.00"}
                  </span>
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="w-full mt-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all shadow-md shadow-primary/20">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {saving ? "Saving..." : "Confirm Sale"}
                </button>
              </div>
            </div>

          </div>

          {/* Recent Sales — desktop: inside grid; mobile: history tab */}
          <div className={`lg:col-span-2 ${mobileTab !== "history" ? "hidden lg:block" : ""}`}>

            {/* Sales Stats Bar */}
            {recentSales.length > 0 && (
              <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-3">
                <div className="bg-card border border-border rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Revenue</p>
                  <p className="text-sm lg:text-base font-black text-foreground mt-0.5">৳{salesStats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Profit</p>
                  <p className={`text-sm lg:text-base font-black mt-0.5 ${salesStats.totalProfit > 0 ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>
                    ৳{salesStats.totalProfit.toLocaleString()}
                  </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Due</p>
                  <p className={`text-sm lg:text-base font-black mt-0.5 ${salesStats.totalDue > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    ৳{salesStats.totalDue.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined text-[18px] text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">search</span>
                <input
                  type="text"
                  placeholder="Search by item or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 bg-card border border-border rounded-xl pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/40 outline-none transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {dateFilterOptions.map((opt) => (
                  <button key={opt.key} onClick={() => setDateFilter(opt.key)}
                    className={`px-3 py-2 text-[11px] font-bold rounded-lg whitespace-nowrap transition-all ${
                      dateFilter === opt.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                    }`}>
                    {opt.label}
                  </button>
                ))}
                {recentSales.length > 0 && (
                  <button onClick={() => exportToCSV(filteredSales.map(s => ({
                    Item: (s as any).inventory_items?.name || "Item",
                    Quantity: s.quantity, "Unit Price": s.unit_price_bdt,
                    Total: s.quantity * s.unit_price_bdt, Received: s.received_now_bdt,
                    Due: s.due, Customer: (s as any).customers?.name || "Walk-in",
                    Date: format(new Date(s.created_at), "yyyy-MM-dd"),
                  })), "sales-export", { name: businessName, phone: businessPhone, address: businessAddress })}
                    className="flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground bg-card rounded-lg border border-border transition-colors whitespace-nowrap">
                    <span className="material-symbols-outlined text-[14px]">download</span> Export
                  </button>
                )}
              </div>
            </div>

            {/* Sales List */}
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-muted rounded" />
                        <div className="h-2 w-24 bg-muted rounded" />
                      </div>
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="bg-card border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-4xl text-muted-foreground/40 mb-3">receipt_long</span>
                <p className="font-bold text-sm text-foreground">
                  {searchQuery || dateFilter !== "all" ? "No matching sales" : "No sales yet"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
                  {searchQuery || dateFilter !== "all"
                    ? "Try adjusting your search or filter"
                    : "Record your first sale using the form"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSales.map((sale) => (
                  <div key={sale.id} className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/20 hover:shadow-sm transition-all group">
                    {editingSale?.id === sale.id ? (
                      <div className="p-3 lg:p-4 space-y-3">
                        <p className="font-bold text-xs text-foreground flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[14px]">edit</span>
                          Editing: {(sale as any).inventory_items?.name || "Item"}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Qty</label>
                            <input type="number" min={1} value={editForm.quantity}
                              onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                              className="w-full h-9 bg-muted/50 border border-border rounded-lg px-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Price</label>
                            <input type="number" value={editForm.unit_price_bdt}
                              onChange={(e) => setEditForm({ ...editForm, unit_price_bdt: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-muted/50 border border-border rounded-lg px-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-muted-foreground uppercase">Received</label>
                            <input type="number" value={editForm.received_now_bdt}
                              onChange={(e) => setEditForm({ ...editForm, received_now_bdt: parseFloat(e.target.value) || 0 })}
                              className="w-full h-9 bg-muted/50 border border-border rounded-lg px-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/30 outline-none transition-all" />
                          </div>
                        </div>
                        {/* Edit preview */}
                        <div className="bg-muted/30 rounded-lg px-3 py-2 flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">New Total: <span className="font-bold text-foreground">৳{(editForm.quantity * editForm.unit_price_bdt).toLocaleString()}</span></span>
                          <span className="text-muted-foreground">New Due: <span className={`font-bold ${(editForm.quantity * editForm.unit_price_bdt - editForm.received_now_bdt) > 0 ? "text-destructive" : "text-foreground"}`}>
                            ৳{Math.max(0, editForm.quantity * editForm.unit_price_bdt - editForm.received_now_bdt).toLocaleString()}
                          </span></span>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button onClick={() => setEditingSale(null)}
                            className="px-4 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-all">
                            Cancel
                          </button>
                          <button onClick={handleEditSave} disabled={saving}
                            className="px-4 py-2 text-[11px] font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm">
                            {saving ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 lg:p-4 flex items-center gap-3">
                        {/* Left: Item icon */}
                        <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-[18px] lg:text-[20px]">shopping_bag</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs lg:text-sm text-foreground truncate">{(sale as any).inventory_items?.name || "Item"}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md mt-0.5">
                              Due ৳{sale.due.toLocaleString()}
                            </span>
                          )}
                          {sale.expected_profit > 0 && sale.due <= 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 px-1.5 py-0.5 rounded-md mt-0.5">
                              +৳{sale.expected_profit.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(sale)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground active:scale-95 transition-all"
                            title="Edit sale">
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button onClick={() => setInvoiceData({
                            sale, itemName: (sale as any).inventory_items?.name || "Item",
                            customerName: (sale as any).customers?.name || "Walk-in", business: businessInfo,
                          })}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground active:scale-95 transition-all"
                            title="View invoice">
                            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                          </button>
                          <button onClick={() => setDeleteConfirm(sale)} disabled={deletingSaleId === sale.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive active:scale-95 disabled:opacity-50 transition-all"
                            title="Delete sale">
                            <span className="material-symbols-outlined text-[16px]">
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

            {/* Results count */}
            {filteredSales.length > 0 && (searchQuery || dateFilter !== "all") && (
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Showing {filteredSales.length} of {recentSales.length} sales
              </p>
            )}
          </div>

          {/* Desktop Summary Sidebar */}
          <div className="hidden lg:block">
            <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-24 shadow-sm">
              <div className="bg-primary/5 px-6 py-4 border-b border-border">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">summarize</span>
                  Sale Summary
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="text-2xl font-black text-foreground">৳{total.toFixed(2)}</span>
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
                <div className="bg-[hsl(var(--success))]/5 border border-[hsl(var(--success))]/10 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[hsl(var(--success))]">trending_up</span>
                      <span className="text-sm font-medium text-muted-foreground">Est. Profit</span>
                    </div>
                    <span className={`text-lg font-black ${profit > 0 ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>
                      ৳{profit > 0 ? profit.toFixed(2) : "0.00"}
                    </span>
                  </div>
                  {landedCost > 0 && profit > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-2 text-right">
                      Margin: {((profit / total) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
              <div className="px-6 pb-6">
                <button onClick={handleSave} disabled={saving}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] shadow-md shadow-primary/20">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {saving ? "Saving..." : "Confirm Sale"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <InvoiceModal data={invoiceData} onClose={() => setInvoiceData(null)} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the sale of <strong>{(deleteConfirm as any)?.inventory_items?.name}</strong> ({deleteConfirm?.quantity} units × ৳{deleteConfirm?.unit_price_bdt}) and restore the stock. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sales;
