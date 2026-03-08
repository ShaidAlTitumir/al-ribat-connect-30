import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";

type InventoryTab = "list" | "add";

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>("list");

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Inventory" />
      {activeTab === "list" ? (
        <InventoryList onAdd={() => setActiveTab("add")} />
      ) : (
        <AddItem onBack={() => setActiveTab("list")} onSaved={() => setActiveTab("list")} />
      )}
    </div>
  );
};

/* ─── Inventory List View ─── */
const InventoryList = ({ onAdd }: { onAdd: () => void }) => {
  const { businessId } = useBusiness();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    const fetchItems = async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      setItems(data || []);
      setLoading(false);
    };
    fetchItems();
  }, [businessId]);

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    if (filter === "low") return matchesSearch && item.current_stock > 0 && item.current_stock <= 5;
    return matchesSearch;
  });

  const totalItems = items.length;
  const lowStock = items.filter((i) => i.current_stock > 0 && i.current_stock <= 5).length;
  const outOfStock = items.filter((i) => i.current_stock === 0).length;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Stock Summary */}
      <section className="grid grid-cols-3 gap-3 lg:gap-6">
        {[
          { label: "Total Items", value: String(totalItems), icon: "inventory", iconColor: "text-primary" },
          { label: "Low Stock", value: String(lowStock), icon: "warning", iconColor: "text-amber-500" },
          { label: "Out of Stock", value: String(outOfStock), icon: "error", iconColor: "text-destructive" },
        ].map((card) => (
          <div key={card.label} className="bg-card p-4 lg:p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-xs lg:text-sm font-medium">{card.label}</span>
              <span className={`material-symbols-outlined ${card.iconColor} text-[20px]`}>{card.icon}</span>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-foreground">{card.value}</div>
          </div>
        ))}
      </section>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">search</span>
          <input
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
            placeholder="Search inventory items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "low"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {f === "all" ? "All Items" : "Low Stock"}
            </button>
          ))}
          <button onClick={onAdd} className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold">
            <span className="material-symbols-outlined text-[18px]">add</span> Add
          </button>
        </div>
      </div>

      {/* Items list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
          <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl text-muted-foreground/50">inventory_2</span>
          </div>
          <h3 className="text-lg font-bold mb-2 text-foreground">No inventory yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6 text-sm">Add your first product to get started.</p>
          <button onClick={onAdd} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">add</span> Add New Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="bg-card p-4 rounded-xl border border-border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-foreground">{item.name}</h4>
                  {item.category && <span className="text-xs text-muted-foreground">{item.category}</span>}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  item.current_stock === 0 ? "bg-destructive/10 text-destructive" :
                  item.current_stock <= 5 ? "bg-amber-100 text-amber-700" :
                  "bg-emerald-100 text-emerald-700"
                }`}>
                  {item.current_stock} in stock
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Weight</span>
                  <p className="font-semibold">{item.weight_per_unit} kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Sell Price</span>
                  <p className="font-semibold">৳{item.default_selling_price || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Add / Restock Item View ─── */
const AddItem = ({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) => {
  const { businessId, exchangeRate } = useBusiness();
  const { user } = useAuth();
  const [itemMode, setItemMode] = useState<"new" | "restock">("new");
  const [shippingMethod, setShippingMethod] = useState("sea");
  const [saving, setSaving] = useState(false);
  const [existingItems, setExistingItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");

  const [form, setForm] = useState({
    name: "", category: "Electronics", quantity: "", weightPerUnit: "",
    buyingCostRmb: "", shippingRate: "", additionalCost: "", sellingPrice: "",
  });

  useEffect(() => {
    if (!businessId) return;
    supabase.from("inventory_items").select("id, name, current_stock, weight_per_unit")
      .eq("business_id", businessId).then(({ data }) => setExistingItems(data || []));
  }, [businessId]);

  const qty = parseInt(form.quantity) || 0;
  const weight = parseFloat(form.weightPerUnit) || 0;
  const buyRmb = parseFloat(form.buyingCostRmb) || 0;
  const shipRate = parseFloat(form.shippingRate) || 0;
  const addCost = parseFloat(form.additionalCost) || 0;
  const sellPrice = parseFloat(form.sellingPrice) || 0;

  const totalWeight = qty * weight;
  const totalBuyingBdt = buyRmb * qty * exchangeRate;
  const totalShipping = totalWeight * shipRate;
  const totalLanded = totalBuyingBdt + totalShipping + addCost;
  const landedPerUnit = qty > 0 ? totalLanded / qty : 0;
  const potentialProfit = qty > 0 ? (sellPrice - landedPerUnit) * qty : 0;
  const margin = sellPrice > 0 ? ((sellPrice - landedPerUnit) / sellPrice * 100) : 0;

  const handleSave = async () => {
    if (!businessId || !user) return;
    if (itemMode === "new" && !form.name.trim()) { toast.error("Item name is required"); return; }
    if (itemMode === "restock" && !selectedItemId) { toast.error("Select an item to restock"); return; }
    if (qty <= 0) { toast.error("Quantity must be greater than 0"); return; }

    setSaving(true);
    try {
      let itemId = selectedItemId;

      if (itemMode === "new") {
        const { data: newItem, error } = await supabase.from("inventory_items").insert({
          name: form.name.trim(), category: form.category, weight_per_unit: weight,
          current_stock: qty, default_selling_price: sellPrice,
          business_id: businessId, user_id: user.id,
        }).select().single();
        if (error) throw error;
        itemId = newItem.id;
      } else {
        // Restock: add to existing stock
        const existing = existingItems.find((i) => i.id === selectedItemId);
        if (!existing) throw new Error("Item not found");
        const { error } = await supabase.from("inventory_items")
          .update({ current_stock: existing.current_stock + qty })
          .eq("id", selectedItemId);
        if (error) throw error;
      }

      // Record purchase transaction
      await supabase.from("purchase_transactions").insert({
        item_id: itemId, quantity: qty, buying_cost_per_unit_rmb: buyRmb,
        shipping_method: shippingMethod, shipping_rate_bdt_per_kg: shipRate,
        additional_cost_bdt: addCost, total_landed_cost_bdt: totalLanded,
        landed_cost_per_unit_bdt: landedPerUnit, exchange_rate_used: exchangeRate,
        business_id: businessId, user_id: user.id,
      });

      // Log activity
      await supabase.from("activity_log").insert({
        action: itemMode === "new" ? "Added new inventory item" : "Restocked inventory item",
        details: { item_name: itemMode === "new" ? form.name : existingItems.find(i => i.id === selectedItemId)?.name, quantity: qty },
        business_id: businessId, user_id: user.id,
      });

      toast.success(itemMode === "new" ? "Item added to inventory!" : "Item restocked!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="p-4 lg:p-8">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back
          </button>
          <h2 className="text-xl lg:text-2xl font-black text-foreground">Add / Restock Item</h2>
        </div>
        <div className="bg-card border border-border p-1 rounded-xl flex">
          {(["new", "restock"] as const).map((m) => (
            <button key={m} onClick={() => setItemMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                itemMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >{m === "new" ? "New Item" : "Restock"}</button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Product Information */}
          <section className="bg-card rounded-xl p-4 lg:p-6 border border-border">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span> Product Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {itemMode === "new" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Item Name</label>
                    <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g. Wireless Headphones" value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Category</label>
                    <select className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" value={form.category} onChange={(e) => updateForm("category", e.target.value)}>
                      <option>Electronics</option><option>Fashion</option><option>Home Decor</option><option>Accessories</option><option>Other</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-foreground">Select Item</label>
                  <select className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground"
                    value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                    <option value="">Choose an item...</option>
                    {existingItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} ({item.current_stock} in stock)</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Quantity</label>
                <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" placeholder="0"
                  value={form.quantity} onChange={(e) => updateForm("quantity", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Weight per unit (kg)</label>
                <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" step="0.01" placeholder="0.00"
                  value={form.weightPerUnit} onChange={(e) => updateForm("weightPerUnit", e.target.value)} />
              </div>
            </div>
          </section>

          {/* Costing & Shipping */}
          <section className="bg-card rounded-xl p-4 lg:p-6 border border-border">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">payments</span> Costing &amp; Shipping
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Buying Cost per unit (RMB)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                  <input className="pl-7 w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" placeholder="0.00"
                    value={form.buyingCostRmb} onChange={(e) => updateForm("buyingCostRmb", e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Shipping Method</label>
                <div className="flex p-1 bg-muted rounded-lg border border-border">
                  {["sea", "air", "luggage"].map((m) => (
                    <button key={m} onClick={() => setShippingMethod(m)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${
                        shippingMethod === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                      }`}
                    >{m.charAt(0).toUpperCase() + m.slice(1)}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Shipping Rate (BDT/kg)</label>
                <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" placeholder="0.00"
                  value={form.shippingRate} onChange={(e) => updateForm("shippingRate", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Additional Cost (BDT)</label>
                <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" placeholder="0.00"
                  value={form.additionalCost} onChange={(e) => updateForm("additionalCost", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-semibold text-foreground">Selling Price (BDT/unit)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                  <input className="pl-7 w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" placeholder="0.00"
                    value={form.sellingPrice} onChange={(e) => updateForm("sellingPrice", e.target.value)} />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Profit Analysis Sidebar */}
        <div className="space-y-6">
          <div className="bg-primary text-primary-foreground rounded-xl p-6 shadow-lg sticky top-24">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">calculate</span> Profit Analysis
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-white/20">
                <span className="text-white/80 text-sm">Total Buying (BDT)</span>
                <span className="font-bold">৳{totalBuyingBdt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80 text-sm">Shipping Cost</span>
                <span className="font-medium">৳{totalShipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/20">
                <span className="text-white/80 text-sm">Landed Cost (Total)</span>
                <span className="font-bold text-xl">৳{totalLanded.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80 text-sm">Cost Per Unit</span>
                <span className="font-medium">৳{landedPerUnit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80 text-sm">Potential Profit</span>
                <span className={`font-medium ${potentialProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {potentialProfit >= 0 ? "+" : ""}৳{potentialProfit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80 text-sm">Profit Margin</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">{margin.toFixed(1)}%</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/20">
              <button onClick={handleSave} disabled={saving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined">save</span>
                {saving ? "Saving..." : "Save Item to Inventory"}
              </button>
              <button onClick={onBack} className="w-full mt-3 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
