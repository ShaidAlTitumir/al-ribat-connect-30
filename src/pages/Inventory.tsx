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
    const threshold = item.low_stock_threshold ?? 5;
    if (filter === "low") return matchesSearch && item.current_stock > 0 && item.current_stock <= threshold;
    if (filter === "out") return matchesSearch && item.current_stock === 0;
    return matchesSearch;
  });

  const totalItems = items.length;
  const lowStock = items.filter((i) => i.current_stock > 0 && i.current_stock <= (i.low_stock_threshold ?? 5)).length;
  const outOfStock = items.filter((i) => i.current_stock === 0).length;
  const lowStockItems = items.filter((i) => i.current_stock > 0 && i.current_stock <= (i.low_stock_threshold ?? 5));

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

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-[24px] mt-0.5">warning</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">Low Stock Alert</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {lowStockItems.map(i => `${i.name} (${i.current_stock} left)`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {outOfStock > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-destructive text-[24px] mt-0.5">error</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-destructive text-sm">Out of Stock</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              {items.filter(i => i.current_stock === 0).map(i => i.name).join(", ")} — need restocking
            </p>
          </div>
        </div>
      )}

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
          {[{ key: "all", label: "All Items" }, { key: "low", label: "Low Stock" }, { key: "out", label: "Out of Stock" }].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {f.label}
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
          {filtered.map((item) => {
            const threshold = item.low_stock_threshold ?? 5;
            return (
            <div key={item.id} className="bg-card p-4 rounded-xl border border-border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-foreground">{item.name}</h4>
                  {item.category && <span className="text-xs text-muted-foreground">{item.category}</span>}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  item.current_stock === 0 ? "bg-destructive/10 text-destructive" :
                  item.current_stock <= threshold ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                }`}>
                  {item.current_stock} in stock
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Weight</span>
                  <p className="font-semibold text-foreground">{item.weight_per_unit} kg</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Sell Price</span>
                  <p className="font-semibold text-foreground">৳{item.default_selling_price || 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Alert at</span>
                  <p className="font-semibold text-foreground">≤ {threshold}</p>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Add / Restock Item View ─── */
const AddItem = ({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) => {
  const { businessId, exchangeRate } = useBusiness();
  const { user } = useAuth();
  const [itemMode, setItemMode] = useState<"new" | "existing">("new");
  const [shippingMethod, setShippingMethod] = useState("sea");
  const [additionalCostCurrency, setAdditionalCostCurrency] = useState<"BDT" | "RMB">("BDT");
  const [saving, setSaving] = useState(false);
  const [existingItems, setExistingItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [useManualRate, setUseManualRate] = useState(false);
  const [manualRate, setManualRate] = useState("");
  const [savedCategories, setSavedCategories] = useState<string[]>([]);
  const [walletBdt, setWalletBdt] = useState(0);
  const [walletRmb, setWalletRmb] = useState(0);

  const [form, setForm] = useState({
    name: "", category: "", quantity: "", totalWeight: "",
    buyingCostRmb: "", totalBuyingCostRmb: "", shippingRate: "", additionalCost: "", sellingPrice: "",
    lowStockThreshold: "5",
  });

  useEffect(() => {
    if (!businessId) return;
    supabase.from("inventory_items").select("id, name, current_stock, weight_per_unit")
      .eq("business_id", businessId).then(({ data }) => setExistingItems(data || []));
    // Fetch wallet balances
    fetchWalletBalances();
  }, [businessId]);

  const fetchWalletBalances = async () => {
    if (!businessId) return;
    let bdt = 0, rmb = 0;
    const [caps, sales, payments, exps, purchases, exch] = await Promise.all([
      supabase.from("capital_contributions").select("amount, currency").eq("business_id", businessId),
      supabase.from("sales").select("received_now_bdt").eq("business_id", businessId),
      supabase.from("customer_ledger").select("amount").eq("business_id", businessId).eq("transaction_type", "payment"),
      supabase.from("expenses").select("amount, currency").eq("business_id", businessId),
      supabase.from("purchase_transactions").select("total_landed_cost_bdt").eq("business_id", businessId),
      supabase.from("exchanges").select("from_currency, amount_from, amount_to").eq("business_id", businessId),
    ]);
    (caps.data || []).forEach((c) => { if (c.currency === "BDT") bdt += c.amount; else rmb += c.amount; });
    (sales.data || []).forEach((s) => { bdt += s.received_now_bdt; });
    (payments.data || []).forEach((p) => { bdt += p.amount; });
    (exps.data || []).forEach((e) => { if (e.currency === "BDT") bdt -= e.amount; else rmb -= e.amount; });
    (purchases.data || []).forEach((p) => { bdt -= p.total_landed_cost_bdt; });
    (exch.data || []).forEach((e) => {
      if (e.from_currency === "BDT") { bdt -= e.amount_from; rmb += e.amount_to; }
      else { rmb -= e.amount_from; bdt += e.amount_to; }
    });
    setWalletBdt(bdt);
    setWalletRmb(rmb);
  };

  // Load existing categories from inventory
  useEffect(() => {
    if (!businessId) return;
    supabase.from("inventory_items").select("category").eq("business_id", businessId).then(({ data }) => {
      const cats = new Set<string>();
      (data || []).forEach((d) => { if (d.category) cats.add(d.category); });
      setSavedCategories(Array.from(cats));
    });
  }, [businessId]);

  const activeRate = useManualRate && manualRate ? parseFloat(manualRate) : exchangeRate;

  const qty = parseInt(form.quantity) || 0;
  const totalWeight = parseFloat(form.totalWeight) || 0;
  const weightPerUnit = qty > 0 ? totalWeight / qty : 0;
  const buyRmb = parseFloat(form.buyingCostRmb) || 0;
  const shipRate = parseFloat(form.shippingRate) || 0;
  const addCost = parseFloat(form.additionalCost) || 0;
  const addCostBdt = additionalCostCurrency === "RMB" ? addCost * activeRate : addCost;
  const sellPrice = parseFloat(form.sellingPrice) || 0;

  const buyingPerUnitBdt = buyRmb * activeRate;
  const totalBuyingBdt = buyRmb * qty * activeRate;
  const totalShipping = totalWeight * shipRate;
  const totalLanded = totalBuyingBdt + totalShipping + addCostBdt;
  const landedPerUnit = qty > 0 ? totalLanded / qty : 0;
  const potentialProfit = qty > 0 ? (sellPrice - landedPerUnit) * qty : 0;
  const margin = sellPrice > 0 ? ((sellPrice - landedPerUnit) / sellPrice * 100) : 0;

  const handleSave = async () => {
    if (!businessId || !user) return;
    if (itemMode === "new" && !form.name.trim()) { toast.error("Item name is required"); return; }
    if (itemMode === "existing" && !form.name.trim()) { toast.error("Item name is required"); return; }
    if (qty <= 0) { toast.error("Quantity must be greater than 0"); return; }
    if (qty <= 0) { toast.error("Quantity must be greater than 0"); return; }

    // Wallet balance check — only for new purchases (not existing items)
    if (itemMode === "new" && totalLanded > 0) {
      if (walletBdt < totalLanded) {
        toast.error(`Insufficient wallet balance. Need ৳${totalLanded.toFixed(0)} but only ৳${Math.max(0, walletBdt).toFixed(0)} available.`);
        return;
      }
    }

    setSaving(true);
    try {
      let itemId = selectedItemId;

      if (itemMode === "new") {
        const { data: newItem, error } = await supabase.from("inventory_items").insert({
          name: form.name.trim(), category: form.category, weight_per_unit: weightPerUnit,
          current_stock: qty, default_selling_price: sellPrice,
          low_stock_threshold: parseInt(form.lowStockThreshold) || 5,
          business_id: businessId, user_id: user.id,
        } as any).select().single();
        if (error) throw error;
        itemId = newItem.id;
      } else {
        // Existing item — add without purchase cost (pre-existing stock)
        const { data: newItem, error } = await supabase.from("inventory_items").insert({
          name: form.name.trim(), category: form.category, weight_per_unit: weightPerUnit,
          current_stock: qty, default_selling_price: sellPrice,
          low_stock_threshold: parseInt(form.lowStockThreshold) || 5,
          business_id: businessId, user_id: user.id,
        } as any).select().single();
        if (error) throw error;
        itemId = newItem.id;
      }

      // Record purchase transaction (only for new purchases, not existing items)
      if (itemMode === "new" && totalLanded > 0) {
        await supabase.from("purchase_transactions").insert({
          item_id: itemId, quantity: qty, buying_cost_per_unit_rmb: buyRmb,
          shipping_method: shippingMethod, shipping_rate_bdt_per_kg: shipRate,
          additional_cost_bdt: addCost, total_landed_cost_bdt: totalLanded,
          landed_cost_per_unit_bdt: landedPerUnit, exchange_rate_used: activeRate,
          business_id: businessId, user_id: user.id,
        });
      }

      // Log activity
      await supabase.from("activity_log").insert({
        action: itemMode === "new" ? "Added new inventory item" : "Added existing item",
        details: { 
          item_name: form.name, 
          quantity: qty,
          ...(itemMode === "new" ? {
            buying_cost_rmb: buyRmb,
            shipping_method: shippingMethod,
            total_landed_cost: totalLanded,
            landed_per_unit: landedPerUnit,
            rate: activeRate,
          } : {}),
        },
        business_id: businessId, user_id: user.id,
      });

      toast.success(itemMode === "new" ? "Item added to inventory!" : "Existing item added!");
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
          <h2 className="text-xl lg:text-2xl font-black text-foreground">Add Item</h2>
        </div>
        <div className="bg-card border border-border p-1 rounded-xl flex">
          {(["new", "existing"] as const).map((m) => (
            <button key={m} onClick={() => setItemMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                itemMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >{m === "new" ? "New Purchase" : "Existing Item"}</button>
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
                    <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Type or select a category" list="category-list" value={form.category} onChange={(e) => updateForm("category", e.target.value)} />
                    <datalist id="category-list">
                      {savedCategories.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Item Name</label>
                    <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g. Existing product name" value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Category</label>
                    <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Type or select a category" list="category-list" value={form.category} onChange={(e) => updateForm("category", e.target.value)} />
                  </div>
                  <div className="md:col-span-2 bg-muted/50 border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      Existing items are products you already have — no wallet balance needed. Costing section is optional.
                    </p>
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Quantity</label>
                <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" placeholder="0"
                  value={form.quantity} onChange={(e) => updateForm("quantity", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Total Weight (kg)</label>
                <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" step="0.01" placeholder="0.00"
                  value={form.totalWeight} onChange={(e) => updateForm("totalWeight", e.target.value)} />
                {qty > 0 && totalWeight > 0 && (
                  <span className="text-xs text-muted-foreground">= {weightPerUnit.toFixed(3)} kg per unit</span>
                )}
              </div>
              {(
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Low Stock Alert Threshold</label>
                  <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" placeholder="5"
                    value={form.lowStockThreshold} onChange={(e) => updateForm("lowStockThreshold", e.target.value)} />
                  <span className="text-xs text-muted-foreground">Get notified when stock drops to this level</span>
                </div>
              )}
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
                    value={form.buyingCostRmb} onChange={(e) => {
                      updateForm("buyingCostRmb", e.target.value);
                      const perUnit = parseFloat(e.target.value) || 0;
                      if (qty > 0 && perUnit > 0) updateForm("totalBuyingCostRmb", (perUnit * qty).toFixed(2));
                    }} />
                </div>
                {buyRmb > 0 && (
                  <span className="text-xs text-muted-foreground">= ৳{buyingPerUnitBdt.toFixed(2)} BDT/unit @ {activeRate} rate</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Total Buying Cost (RMB)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                  <input className="pl-7 w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" placeholder="0.00"
                    value={form.totalBuyingCostRmb} onChange={(e) => {
                      updateForm("totalBuyingCostRmb", e.target.value);
                      const total = parseFloat(e.target.value) || 0;
                      if (qty > 0 && total > 0) updateForm("buyingCostRmb", (total / qty).toFixed(2));
                    }} />
                </div>
                {parseFloat(form.totalBuyingCostRmb) > 0 && (
                  <span className="text-xs text-muted-foreground">= ৳{(parseFloat(form.totalBuyingCostRmb) * activeRate).toFixed(2)} BDT total</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">RMB Rate</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-muted-foreground">Manual</span>
                    <button onClick={() => setUseManualRate(!useManualRate)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${useManualRate ? "bg-primary" : "bg-muted border border-border"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${useManualRate ? "translate-x-4" : ""}`} />
                    </button>
                  </label>
                </div>
                {useManualRate ? (
                  <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" step="0.01" placeholder="Enter rate"
                    value={manualRate} onChange={(e) => setManualRate(e.target.value)} />
                ) : (
                  <div className="rounded-lg border border-border bg-muted px-4 py-2.5 text-muted-foreground">
                    {exchangeRate} BDT/RMB (default)
                  </div>
                )}
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
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Cost Per Unit (BDT)</label>
                <div className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground font-bold">
                  ৳{landedPerUnit.toFixed(2)}
                </div>
                <span className="text-xs text-muted-foreground">Auto-calculated landed cost per unit</span>
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

        {/* Wallet Balance & Profit Analysis Sidebar */}
        <div className="space-y-6">
          {/* Wallet Balance Card */}
          <div className={`rounded-xl p-4 border ${totalLanded > 0 && walletBdt < totalLanded ? "bg-destructive/10 border-destructive/30" : "bg-card border-border"}`}>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span> Wallet Balance
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">BDT</span>
                <p className={`font-bold text-lg ${walletBdt >= 0 ? "text-foreground" : "text-destructive"}`}>৳{walletBdt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">RMB</span>
                <p className={`font-bold text-lg ${walletRmb >= 0 ? "text-foreground" : "text-destructive"}`}>¥{walletRmb.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
            {totalLanded > 0 && walletBdt < totalLanded && (
              <div className="mt-3 flex items-center gap-1.5 text-destructive text-xs font-medium">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                Insufficient balance — need ৳{totalLanded.toFixed(0)}
              </div>
            )}
            {totalLanded > 0 && walletBdt >= totalLanded && (
              <div className="mt-3 flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Sufficient balance for this purchase
              </div>
            )}
          </div>

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
