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

  // Form state
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  // Data
  const [items, setItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [landedCost, setLandedCost] = useState(0);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [businessInfo, setBusinessInfo] = useState<any>({});

  useEffect(() => {
    if (!businessId) return;
    supabase.from("inventory_items").select("*").eq("business_id", businessId).gt("current_stock", 0)
      .then(({ data }) => setItems(data || []));
    supabase.from("customers").select("*").eq("business_id", businessId)
      .then(({ data }) => setCustomers(data || []));
    supabase.from("sales").select("*, inventory_items(name), customers(name)")
      .eq("business_id", businessId).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setRecentSales(data || []));
    supabase.from("businesses").select("name, phone, address").eq("id", businessId).single()
      .then(({ data }) => setBusinessInfo(data || {}));
  }, [businessId]);

  // Get landed cost for selected item
  useEffect(() => {
    if (!selectedItemId) { setLandedCost(0); return; }
    supabase.from("purchase_transactions").select("landed_cost_per_unit_bdt")
      .eq("item_id", selectedItemId).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        setLandedCost(data?.[0]?.landed_cost_per_unit_bdt || 0);
      });
    // Auto-fill selling price from item
    const item = items.find((i) => i.id === selectedItemId);
    if (item?.default_selling_price) setUnitPrice(String(item.default_selling_price));
  }, [selectedItemId, items]);

  const total = quantity * (parseFloat(unitPrice) || 0);
  const due = total - (parseFloat(receivedAmount) || 0);
  const profit = (parseFloat(unitPrice) || 0 - landedCost) * quantity;

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

      // Create new customer if needed
      if (showNewCustomer && newCustomerName.trim()) {
        const { data: newCust, error } = await supabase.from("customers").insert({
          name: newCustomerName.trim(), phone: newCustomerPhone.trim() || null,
          total_due: 0, business_id: businessId, user_id: user.id,
        }).select().single();
        if (error) throw error;
        custId = newCust.id;
      }

      const dueAmount = Math.max(0, due);

      // Insert sale
      const { data: sale, error: saleError } = await supabase.from("sales").insert({
        item_id: selectedItemId, quantity, unit_price_bdt: parseFloat(unitPrice),
        received_now_bdt: parseFloat(receivedAmount) || 0, due: dueAmount,
        expected_profit: profit, customer_id: custId, cost_rate: exchangeRate,
        business_id: businessId, user_id: user.id,
      }).select().single();
      if (saleError) throw saleError;

      // Deduct stock
      const newStock = (item?.current_stock || 0) - quantity;
      await supabase.from("inventory_items")
        .update({ current_stock: newStock })
        .eq("id", selectedItemId);

      // Low stock notification
      const threshold = item?.low_stock_threshold ?? 5;
      if (newStock > 0 && newStock <= threshold) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          business_id: businessId,
          title: "Low Stock Alert",
          message: `${item?.name} is running low — only ${newStock} left (threshold: ${threshold})`,
          type: "low_stock",
        } as any);
      } else if (newStock === 0) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          business_id: businessId,
          title: "Out of Stock",
          message: `${item?.name} is now out of stock. Consider restocking.`,
          type: "low_stock",
        } as any);
      }

      // Update customer due
      if (custId && dueAmount > 0) {
        const cust = customers.find((c) => c.id === custId);
        await supabase.from("customers")
          .update({ total_due: (cust?.total_due || 0) + dueAmount })
          .eq("id", custId);

        // Add to ledger
        await supabase.from("customer_ledger").insert({
          customer_id: custId, transaction_type: "sale", amount: dueAmount,
          reference_id: sale.id, business_id: businessId, user_id: user.id,
        });
      }

      // Log activity
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
      // Reset form
      setSelectedItemId(""); setQuantity(1); setUnitPrice(""); setReceivedAmount("");
      setSelectedCustomerId(""); setNewCustomerName(""); setNewCustomerPhone(""); setShowNewCustomer(false);

      // Refresh data
      const { data: updatedItems } = await supabase.from("inventory_items").select("*").eq("business_id", businessId).gt("current_stock", 0);
      setItems(updatedItems || []);
      const { data: updatedSales } = await supabase.from("sales").select("*, inventory_items(name), customers(name)")
        .eq("business_id", businessId).order("created_at", { ascending: false }).limit(10);
      setRecentSales(updatedSales || []);
      const { data: updatedCustomers } = await supabase.from("customers").select("*").eq("business_id", businessId);
      setCustomers(updatedCustomers || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to save sale");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Record Sale" />
      <div className="p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sale Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Item Information */}
            <div className="bg-card p-4 lg:p-6 rounded-xl border border-border">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shopping_basket</span> Item Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="block text-sm font-semibold mb-1.5">Select Item</label>
                  <select className="w-full h-11 bg-muted border border-border rounded-lg px-4 text-foreground"
                    value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                    <option value="">Search for an item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} ({item.current_stock} in stock)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Quantity</label>
                  <input type="number" value={quantity} min={1}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="w-full h-11 bg-muted border border-border rounded-lg px-4 text-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Unit Price (BDT)</label>
                  <input type="number" placeholder="0.00" value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full h-11 bg-muted border border-border rounded-lg px-4 text-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Landed Cost (Auto)</label>
                  <div className="w-full h-11 bg-muted/80 border border-border rounded-lg px-4 flex items-center text-muted-foreground font-medium">
                    ৳{landedCost.toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Received Amount (BDT)</label>
                  <input type="number" placeholder="Amount paid now" value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="w-full h-11 bg-muted border border-border rounded-lg px-4 text-foreground" />
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="bg-card p-4 lg:p-6 rounded-xl border border-border">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span> Customer
              </h3>
              {!showNewCustomer ? (
                <div className="space-y-3">
                  <select className="w-full h-11 bg-muted border border-border rounded-lg px-4 text-foreground"
                    value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                    <option value="">Select customer (optional)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} {c.total_due > 0 ? `(Due: ৳${c.total_due})` : ""}</option>
                    ))}
                  </select>
                  <button onClick={() => setShowNewCustomer(true)}
                    className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">add</span> Add New Customer
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Customer Name</label>
                    <input type="text" placeholder="Full name" value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full h-11 bg-muted border border-border rounded-lg px-4 text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Phone</label>
                    <input type="tel" placeholder="+880 1712-345678" value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full h-11 bg-muted border border-border rounded-lg px-4 text-foreground" />
                  </div>
                  <button onClick={() => { setShowNewCustomer(false); setNewCustomerName(""); setNewCustomerPhone(""); }}
                    className="text-muted-foreground text-sm hover:underline">Cancel</button>
                </div>
              )}
            </div>

            {/* Recent Sales */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Recent Sales</h3>
                {recentSales.length > 0 && (
                  <button onClick={() => exportToCSV(recentSales.map(s => ({
                    Item: (s as any).inventory_items?.name || "Item",
                    Quantity: s.quantity, "Unit Price": s.unit_price_bdt,
                    Total: s.quantity * s.unit_price_bdt, Received: s.received_now_bdt,
                    Due: s.due, Customer: (s as any).customers?.name || "Walk-in",
                    Date: format(new Date(s.created_at), "yyyy-MM-dd"),
                  })), "sales-export", { name: businessName, phone: businessPhone, address: businessAddress })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted rounded-lg border border-border">
                    <span className="material-symbols-outlined text-[16px]">download</span> Export
                  </button>
                )}
              </div>
              {recentSales.length === 0 ? (
                <div className="bg-card border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center text-center">
                  <span className="material-symbols-outlined text-3xl text-muted-foreground mb-2">history</span>
                  <p className="font-bold text-foreground">No recent sales yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Sales you record will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="bg-card p-3 rounded-lg border border-border flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{(sale as any).inventory_items?.name || "Item"}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.quantity} × ৳{sale.unit_price_bdt} • {(sale as any).customers?.name || "Walk-in"}
                          {" • "}{format(new Date(sale.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-sm">৳{(sale.quantity * sale.unit_price_bdt).toFixed(0)}</p>
                          {sale.due > 0 && <p className="text-xs text-destructive">Due: ৳{sale.due}</p>}
                        </div>
                        <button
                          onClick={() => setInvoiceData({
                            sale,
                            itemName: (sale as any).inventory_items?.name || "Item",
                            customerName: (sale as any).customers?.name || "Walk-in",
                            business: businessInfo,
                          })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          title="View Invoice">
                          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <div className="bg-primary text-primary-foreground p-6 rounded-xl shadow-lg sticky top-24">
              <h3 className="text-sm font-bold uppercase tracking-wider opacity-80 mb-6">Sale Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-sm opacity-90">Total Amount</span>
                  <span className="text-xl font-black">৳{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-sm opacity-90">Amount Due</span>
                  <span className="text-xl font-black">৳{Math.max(0, due).toFixed(2)}</span>
                </div>
                <div className="bg-white/10 rounded-lg p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      <span className="text-sm font-medium">Expected Profit</span>
                    </div>
                    <span className="text-lg font-bold">৳{profit > 0 ? profit.toFixed(2) : "0.00"}</span>
                  </div>
                </div>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined">check_circle</span>
                {saving ? "Saving..." : "Save Sale"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <InvoiceModal data={invoiceData} onClose={() => setInvoiceData(null)} />
    </div>
  );
};

export default Sales;
