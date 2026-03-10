import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";

type InventoryTab = "list" | "add" | "samples" | "edit";

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>("list");
  const [editingItem, setEditingItem] = useState<any>(null);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Inventory" />
      {activeTab === "list" ? (
        <InventoryList onAdd={() => setActiveTab("add")} onSamples={() => setActiveTab("samples")} onEdit={(item: any) => { setEditingItem(item); setActiveTab("edit"); }} />
      ) : activeTab === "samples" ? (
        <SampleOrders onBack={() => setActiveTab("list")} />
      ) : activeTab === "edit" ? (
        <EditItem item={editingItem} onBack={() => setActiveTab("list")} onSaved={() => setActiveTab("list")} />
      ) : (
        <AddItem onBack={() => setActiveTab("list")} onSaved={() => setActiveTab("list")} />
      )}
    </div>
  );
};

/* ─── Inventory List View ─── */
const InventoryList = ({ onAdd, onSamples, onEdit }: { onAdd: () => void; onSamples: () => void; onEdit: (item: any) => void }) => {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [itemStats, setItemStats] = useState<Record<string, { totalCost: number; totalSale: number; profit: number }>>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchItems = async () => {
    if (!businessId) return;
    const [{ data: itemsData }, { data: purchases }, { data: sales }] = await Promise.all([
      supabase.from("inventory_items").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("purchase_transactions").select("item_id, total_landed_cost_bdt").eq("business_id", businessId),
      supabase.from("sales").select("item_id, unit_price_bdt, quantity, expected_profit").eq("business_id", businessId),
    ]);
    setItems(itemsData || []);

    const stats: Record<string, { totalCost: number; totalSale: number; profit: number }> = {};
    (purchases || []).forEach((p) => {
      if (!stats[p.item_id]) stats[p.item_id] = { totalCost: 0, totalSale: 0, profit: 0 };
      stats[p.item_id].totalCost += p.total_landed_cost_bdt || 0;
    });
    (sales || []).forEach((s) => {
      if (!stats[s.item_id]) stats[s.item_id] = { totalCost: 0, totalSale: 0, profit: 0 };
      stats[s.item_id].totalSale += (s.unit_price_bdt || 0) * (s.quantity || 0);
      stats[s.item_id].profit += s.expected_profit || 0;
    });
    setItemStats(stats);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [businessId]);

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item? Related purchase records will also be removed.")) return;
    try {
      await supabase.from("purchase_transactions").delete().eq("item_id", itemId);
      await supabase.from("inventory_items").delete().eq("id", itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
      toast.success("Item deleted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

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
    <div className="p-4 lg:p-8 space-y-4 lg:space-y-6 max-w-7xl mx-auto w-full">
      {/* Stock Summary */}
      <section className="grid grid-cols-3 gap-2 lg:gap-6">
        {[
          { label: "Total", value: String(totalItems), icon: "inventory", iconColor: "text-primary" },
          { label: "Low Stock", value: String(lowStock), icon: "warning", iconColor: "text-amber-500" },
          { label: "Out", value: String(outOfStock), icon: "error", iconColor: "text-destructive" },
        ].map((card) => (
          <div key={card.label} className="bg-card p-3 lg:p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-1 lg:mb-2">
              <span className="text-muted-foreground text-[10px] lg:text-sm font-medium">{card.label}</span>
              <span className={`material-symbols-outlined ${card.iconColor} text-[16px] lg:text-[20px]`}>{card.icon}</span>
            </div>
            <div className="text-xl lg:text-3xl font-bold text-foreground">{card.value}</div>
          </div>
        ))}
      </section>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5 shrink-0">warning</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-800 dark:text-amber-300 text-xs">Low Stock Alert</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 line-clamp-2">
              {lowStockItems.map(i => `${i.name} (${i.current_stock})`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {outOfStock > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
          <span className="material-symbols-outlined text-destructive text-[20px] mt-0.5 shrink-0">error</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-destructive text-xs">Out of Stock</p>
            <p className="text-[10px] text-destructive/80 mt-0.5 line-clamp-2">
              {items.filter(i => i.current_stock === 0).map(i => i.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[20px]">search</span>
        <input
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
          placeholder="Search inventory items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter & Actions — horizontal scroll on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
        <button onClick={onAdd} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs lg:text-sm font-bold whitespace-nowrap shrink-0">
          <span className="material-symbols-outlined text-[16px]">add</span> Add
        </button>
        {[{ key: "all", label: "All Items" }, { key: "low", label: "Low Stock" }, { key: "out", label: "Out of Stock" }].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs lg:text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button onClick={onSamples} className="flex items-center gap-1 bg-accent text-foreground px-3 py-1.5 rounded-full text-xs lg:text-sm font-bold border border-border whitespace-nowrap shrink-0">
          <span className="material-symbols-outlined text-[16px]">science</span> Samples
        </button>
      </div>

      {/* Items list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border min-h-[250px] flex flex-col items-center justify-center p-6 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-3xl text-muted-foreground/50">inventory_2</span>
          </div>
          <h3 className="text-base font-bold mb-1 text-foreground">No inventory yet</h3>
          <p className="text-muted-foreground max-w-sm mb-4 text-xs">Add your first product to get started.</p>
          <button onClick={onAdd} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold text-sm">
            <span className="material-symbols-outlined text-[18px]">add</span> Add New Item
          </button>
        </div>
      ) : (
        <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
          {filtered.map((item) => {
            const threshold = item.low_stock_threshold ?? 5;
            return (
            (() => {
              const isExpanded = expandedItems.has(item.id);
              const toggle = () => setExpandedItems(prev => {
                const next = new Set(prev);
                next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                return next;
              });
              const st = itemStats[item.id];
              return (
              <div key={item.id} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Compact header — always visible */}
                <button onClick={toggle} className="w-full flex items-center gap-3 p-3 lg:p-4 text-left active:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-foreground text-sm truncate">{item.name}</h4>
                      {item.category && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.category}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>৳{item.default_selling_price || 0}/pc</span>
                      {st && st.totalSale > 0 && (
                        <span className={st.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                          Profit ৳{Math.round(st.profit).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    item.current_stock === 0 ? "bg-destructive/10 text-destructive" :
                    item.current_stock <= threshold ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}>
                    {item.current_stock} pcs
                  </span>
                  <span className={`material-symbols-outlined text-muted-foreground text-[18px] transition-transform ${isExpanded ? "rotate-180" : ""}`}>expand_more</span>
                </button>

                {/* Expandable details */}
                {isExpanded && (
                  <div className="px-3 pb-3 lg:px-4 lg:pb-4 space-y-2 border-t border-border pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground text-[10px]">Weight</span>
                        <p className="font-semibold text-foreground">{Number(item.weight_per_unit).toFixed(3)} kg</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px]">Sell Price</span>
                        <p className="font-semibold text-foreground">৳{item.default_selling_price || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px]">Alert at</span>
                        <p className="font-semibold text-foreground">≤ {threshold}</p>
                      </div>
                    </div>
                    {st && (st.totalCost > 0 || st.totalSale > 0) && (
                      <div className="grid grid-cols-3 gap-2 text-xs bg-muted/50 rounded-lg p-2">
                        <div>
                          <span className="text-muted-foreground text-[10px]">Total Cost</span>
                          <p className="font-semibold text-foreground">৳{Math.round(st.totalCost).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px]">Total Sale</span>
                          <p className="font-semibold text-foreground">৳{Math.round(st.totalSale).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px]">Profit</span>
                          <p className={`font-semibold ${st.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                            ৳{Math.round(st.profit).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 border-t border-border pt-2.5">
                      <button onClick={() => onEdit(item)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg py-1.5 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                      </button>
                      <div className="w-px h-5 bg-border" />
                      <button onClick={() => handleDelete(item.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg py-1.5 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })()
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Add / Restock Item View ─── */
const AddItem = ({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) => {
  const { businessId, exchangeRate, isSolo } = useBusiness();
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
      supabase.from("purchase_transactions").select("total_landed_cost_bdt, buying_cost_per_unit_rmb, quantity, exchange_rate_used").eq("business_id", businessId),
      supabase.from("exchanges").select("from_currency, amount_from, amount_to").eq("business_id", businessId),
    ]);
    (caps.data || []).forEach((c) => { if (c.currency === "BDT") bdt += c.amount; else rmb += c.amount; });
    (sales.data || []).forEach((s) => { bdt += s.received_now_bdt; });
    (payments.data || []).forEach((p) => { bdt += p.amount; });
    (exps.data || []).forEach((e) => { if (e.currency === "BDT") bdt -= e.amount; else rmb -= e.amount; });
    (purchases.data || []).forEach((p) => {
      const buyingRmb = (p.buying_cost_per_unit_rmb || 0) * (p.quantity || 0);
      rmb -= buyingRmb;
      const bdtPortion = (p.total_landed_cost_bdt || 0) - (buyingRmb * (p.exchange_rate_used || 0));
      bdt -= bdtPortion;
    });
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
    // Buying cost (RMB) deducted from RMB wallet, shipping + additional cost from BDT wallet
    if (itemMode === "new") {
      const neededRmb = buyRmb * qty; // buying cost in RMB
      const neededBdt = totalShipping + addCostBdt; // shipping (always BDT) + additional cost converted to BDT
      if (neededRmb > 0 && walletRmb < neededRmb) {
        toast.error(`Insufficient RMB balance. Need ¥${neededRmb.toFixed(0)} but only ¥${Math.max(0, walletRmb).toFixed(0)} available.`);
        return;
      }
      if (neededBdt > 0 && walletBdt < neededBdt) {
        toast.error(`Insufficient BDT balance. Need ৳${neededBdt.toFixed(0)} but only ৳${Math.max(0, walletBdt).toFixed(0)} available.`);
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
          additional_cost_bdt: addCostBdt, total_landed_cost_bdt: totalLanded,
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

  // Solo mode: simple form
  const [soloForm, setSoloForm] = useState({ name: "", category: "", quantity: "", totalCost: "", sellingPrice: "", lowStockThreshold: "5", sku: "", supplier: "", unit: "pcs", description: "" });
  const soloQty = parseInt(soloForm.quantity) || 0;
  const soloCost = parseFloat(soloForm.totalCost) || 0;
  const soloSellPrice = parseFloat(soloForm.sellingPrice) || 0;
  const soloCostPerUnit = soloQty > 0 ? soloCost / soloQty : 0;
  const soloProfit = soloQty > 0 ? (soloSellPrice - soloCostPerUnit) * soloQty : 0;

  const handleSoloSave = async () => {
    if (!businessId || !user) return;
    if (!soloForm.name.trim()) { toast.error("Item name is required"); return; }
    if (soloQty <= 0) { toast.error("Quantity must be > 0"); return; }
    setSaving(true);
    try {
      const { data: newItem, error } = await supabase.from("inventory_items").insert({
        name: soloForm.name.trim(), category: soloForm.category || null,
        weight_per_unit: 0, current_stock: soloQty, default_selling_price: soloSellPrice,
        low_stock_threshold: parseInt(soloForm.lowStockThreshold) || 5,
        business_id: businessId, user_id: user.id,
        sku: soloForm.sku.trim() || null, supplier: soloForm.supplier.trim() || null,
        unit: soloForm.unit || "pcs", description: soloForm.description.trim() || null,
      } as any).select().single();
      if (error) throw error;

      if (soloCost > 0) {
        await supabase.from("purchase_transactions").insert({
          item_id: newItem.id, quantity: soloQty, buying_cost_per_unit_rmb: 0,
          shipping_method: "sea", shipping_rate_bdt_per_kg: 0,
          additional_cost_bdt: 0, total_landed_cost_bdt: soloCost,
          landed_cost_per_unit_bdt: soloCostPerUnit, exchange_rate_used: 1,
          business_id: businessId, user_id: user.id,
        });
      }

      await supabase.from("activity_log").insert({
        action: "Added new inventory item",
        details: { item_name: soloForm.name, quantity: soloQty, total_cost: soloCost, selling_price: soloSellPrice },
        business_id: businessId, user_id: user.id,
      });

      toast.success("Item added!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally { setSaving(false); }
  };

  if (isSolo) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full">
        <header className="mb-5 flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
          </button>
          <h2 className="text-lg lg:text-2xl font-black text-foreground">Add Product</h2>
        </header>

        <div className="space-y-3">
          <section className="bg-card rounded-xl p-4 border border-border">
            <h3 className="text-base font-bold mb-3.5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">info</span> Product Details
            </h3>
            <div className="space-y-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Product Name *</label>
                <input className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g. T-Shirt, Shoes" value={soloForm.name} onChange={(e) => setSoloForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Category</label>
                <input className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g. Clothing, Electronics" list="category-list" value={soloForm.category} onChange={(e) => setSoloForm(f => ({ ...f, category: e.target.value }))} />
                <datalist id="category-list">
                  {savedCategories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Quantity *</label>
                <input className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground" type="number" placeholder="0"
                  value={soloForm.quantity} onChange={(e) => setSoloForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Total Cost (৳)</label>
                <input className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground" type="number" placeholder="Total purchase cost in BDT"
                  value={soloForm.totalCost} onChange={(e) => setSoloForm(f => ({ ...f, totalCost: e.target.value }))} />
                {soloQty > 0 && soloCost > 0 && (
                  <span className="text-[11px] text-muted-foreground">= ৳{soloCostPerUnit.toFixed(2)} per unit</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Selling Price (৳/unit)</label>
                <input className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground" type="number" placeholder="Price per piece"
                  value={soloForm.sellingPrice} onChange={(e) => setSoloForm(f => ({ ...f, sellingPrice: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Low Stock Alert</label>
                <input className="h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground" type="number" placeholder="5"
                  value={soloForm.lowStockThreshold} onChange={(e) => setSoloForm(f => ({ ...f, lowStockThreshold: e.target.value }))} />
              </div>
            </div>
          </section>

          {/* Profit Preview */}
          {soloQty > 0 && soloSellPrice > 0 && (
            <section className="bg-primary text-primary-foreground rounded-xl p-4 shadow-md">
              <h3 className="text-xs font-bold mb-2.5 flex items-center gap-1.5 opacity-90">
                <span className="material-symbols-outlined text-[16px]">calculate</span> Profit Preview
              </h3>
              <div className="space-y-1.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="opacity-80">Cost/Unit</span>
                  <span className="font-bold">৳{soloCostPerUnit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">Sell Price</span>
                  <span className="font-bold">৳{soloSellPrice}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-primary-foreground/20">
                  <span className="opacity-80">Total Profit</span>
                  <span className={`font-bold ${soloProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {soloProfit >= 0 ? "+" : ""}৳{soloProfit.toFixed(0)}
                  </span>
                </div>
              </div>
            </section>
          )}

          <div className="flex items-center gap-3 pt-1 pb-2">
            <button onClick={handleSoloSave} disabled={saving}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] text-sm">
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? "Saving..." : "Add Product"}
            </button>
            <button onClick={onBack} className="px-5 text-sm text-muted-foreground hover:text-foreground font-semibold py-2.5 transition-all active:scale-95">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                <label className="text-sm font-semibold text-foreground">Additional Cost</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{additionalCostCurrency === "RMB" ? "¥" : "৳"}</span>
                    <input className="pl-7 w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number" placeholder="0.00"
                      value={form.additionalCost} onChange={(e) => updateForm("additionalCost", e.target.value)} />
                  </div>
                  <div className="flex p-1 bg-muted rounded-lg border border-border">
                    {(["BDT", "RMB"] as const).map((c) => (
                      <button key={c} onClick={() => setAdditionalCostCurrency(c)}
                        className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                          additionalCostCurrency === c ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                        }`}
                      >{c}</button>
                    ))}
                  </div>
                </div>
                {additionalCostCurrency === "RMB" && addCost > 0 && (
                  <span className="text-xs text-muted-foreground">= ৳{addCostBdt.toFixed(2)} BDT @ {activeRate} rate</span>
                )}
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

/* ─── Sample Orders View ─── */
const SampleOrders = ({ onBack }: { onBack: () => void }) => {
  const { businessId, exchangeRate } = useBusiness();
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [orderType, setOrderType] = useState<"buy" | "send">("buy");
  const [filterType, setFilterType] = useState<"all" | "buy" | "send">("all");
  const [form, setForm] = useState({
    item_name: "", quantity: "1", cost_rmb: "", customer_name: "", supplier_name: "", notes: "",
  });

  useEffect(() => {
    if (!businessId) return;
    fetchOrders();
  }, [businessId]);

  const fetchOrders = async () => {
    const { data } = await (supabase.from("sample_orders").select("*") as any)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ item_name: "", quantity: "1", cost_rmb: "", customer_name: "", supplier_name: "", notes: "" });
    setEditingOrder(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!businessId || !user) return;
    if (!form.item_name.trim()) { toast.error("Item name is required"); return; }
    const qty = parseInt(form.quantity) || 1;
    const cost = parseFloat(form.cost_rmb) || 0;

    if (editingOrder) {
      const { error } = await (supabase.from("sample_orders") as any)
        .update({
          type: orderType, item_name: form.item_name.trim(), quantity: qty,
          cost_rmb: cost, customer_name: form.customer_name.trim() || null,
          supplier_name: form.supplier_name.trim() || null, notes: form.notes.trim() || null,
        })
        .eq("id", editingOrder.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Sample order updated!");
    } else {
      const { error } = await (supabase.from("sample_orders") as any).insert({
        business_id: businessId, user_id: user.id, type: orderType,
        item_name: form.item_name.trim(), quantity: qty, cost_rmb: cost,
        customer_name: form.customer_name.trim() || null,
        supplier_name: form.supplier_name.trim() || null, notes: form.notes.trim() || null,
      });
      if (error) { toast.error(error.message); return; }
      await supabase.from("activity_log").insert({
        action: orderType === "buy" ? "Created sample buy order" : "Created sample send order",
        details: { item_name: form.item_name, quantity: qty, cost_rmb: cost },
        business_id: businessId, user_id: user.id,
      });
      toast.success("Sample order added!");
    }
    resetForm();
    fetchOrders();
  };

  const handleEdit = (order: any) => {
    setEditingOrder(order);
    setOrderType(order.type);
    setForm({
      item_name: order.item_name, quantity: String(order.quantity),
      cost_rmb: String(order.cost_rmb || ""), customer_name: order.customer_name || "",
      supplier_name: order.supplier_name || "", notes: order.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (order: any) => {
    if (!window.confirm(`Delete sample order for "${order.item_name}"?`)) return;
    const { error } = await (supabase.from("sample_orders") as any).delete().eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Sample order deleted");
    fetchOrders();
  };

  const handleStatusChange = async (order: any, status: string) => {
    const { error } = await (supabase.from("sample_orders") as any)
      .update({ status })
      .eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status updated to ${status}`);
    fetchOrders();
  };

  const filtered = orders.filter(o => filterType === "all" || o.type === filterType);
  const totalCostRmb = filtered.reduce((s, o) => s + (o.cost_rmb || 0), 0);
  const buyCount = orders.filter(o => o.type === "buy").length;
  const sendCount = orders.filter(o => o.type === "send").length;

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    ordered: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    received: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back
          </button>
          <h2 className="text-xl lg:text-2xl font-black text-foreground">Sample Orders</h2>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold">
          <span className="material-symbols-outlined text-[18px]">add</span> New Sample Order
        </button>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-3 lg:gap-6">
        {[
          { label: "Buy Orders", value: String(buyCount), icon: "shopping_cart", iconColor: "text-primary" },
          { label: "Send Orders", value: String(sendCount), icon: "local_shipping", iconColor: "text-primary" },
          { label: "Total Cost", value: `¥${totalCostRmb.toFixed(0)}`, icon: "currency_yuan", iconColor: "text-primary" },
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

      {/* Filter */}
      <div className="flex items-center gap-2">
        {[{ key: "all", label: "All" }, { key: "buy", label: "Buy" }, { key: "send", label: "Send" }].map((f) => (
          <button key={f.key} onClick={() => setFilterType(f.key as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              filterType === f.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <section className="bg-card rounded-xl p-4 lg:p-6 border border-border space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">science</span>
            {editingOrder ? "Edit Sample Order" : "New Sample Order"}
          </h3>
          <div className="flex p-1 bg-muted rounded-lg w-fit">
            {(["buy", "send"] as const).map((t) => (
              <button key={t} onClick={() => setOrderType(t)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  orderType === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}>
                {t === "buy" ? "Buy from Supplier" : "Send to Customer"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Item Name</label>
              <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground"
                placeholder="e.g. Product sample" value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Quantity</label>
              <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number"
                placeholder="1" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Cost (RMB)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                <input className="pl-7 w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground" type="number"
                  placeholder="0.00" value={form.cost_rmb}
                  onChange={(e) => setForm({ ...form, cost_rmb: e.target.value })} />
              </div>
              {parseFloat(form.cost_rmb) > 0 && (
                <span className="text-xs text-muted-foreground">
                  ≈ ৳{(parseFloat(form.cost_rmb) * exchangeRate).toFixed(0)} BDT @ {exchangeRate}
                </span>
              )}
            </div>
            {orderType === "buy" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Supplier Name</label>
                <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground"
                  placeholder="e.g. Guangzhou supplier" value={form.supplier_name}
                  onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Customer Name</label>
                <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground"
                  placeholder="e.g. Customer for trial" value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
            )}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-foreground">Notes</label>
              <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground"
                placeholder="Any additional details..." value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave}
              className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 rounded-lg text-sm hover:bg-primary/90">
              {editingOrder ? "Update" : "Add Sample Order"}
            </button>
            <button onClick={resetForm}
              className="flex-1 bg-muted border border-border text-foreground font-bold py-2.5 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border min-h-[200px] flex flex-col items-center justify-center p-8 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-muted-foreground/50">science</span>
          </div>
          <h3 className="text-lg font-bold mb-1 text-foreground">No sample orders</h3>
          <p className="text-muted-foreground text-sm">Create your first sample order to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    order.type === "buy" ? "bg-primary/10 text-primary" : "bg-accent text-foreground"
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {order.type === "buy" ? "shopping_cart" : "local_shipping"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground">{order.item_name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[order.status] || "bg-muted text-muted-foreground"}`}>
                        {order.status}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">
                        {order.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span>Qty: {order.quantity}</span>
                      <span>¥{order.cost_rmb || 0} (≈ ৳{((order.cost_rmb || 0) * exchangeRate).toFixed(0)})</span>
                      {order.supplier_name && <span>Supplier: {order.supplier_name}</span>}
                      {order.customer_name && <span>Customer: {order.customer_name}</span>}
                      <span>{format(new Date(order.created_at), "MMM d, yyyy")}</span>
                    </div>
                    {order.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{order.notes}"</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Status dropdown */}
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order, e.target.value)}
                    className="text-xs bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground"
                  >
                    {order.type === "buy" ? (
                      <>
                        <option value="pending">Pending</option>
                        <option value="ordered">Ordered</option>
                        <option value="shipped">Shipped</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                      </>
                    ) : (
                      <>
                        <option value="pending">Pending</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </>
                    )}
                  </select>
                  <button onClick={() => handleEdit(order)}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(order)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Edit Item View ─── */
const EditItem = ({ item, onBack, onSaved }: { item: any; onBack: () => void; onSaved: () => void }) => {
  const { businessId } = useBusiness();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: item?.name || "",
    category: item?.category || "",
    current_stock: String(item?.current_stock || 0),
    weight_per_unit: String(item?.weight_per_unit || 0),
    default_selling_price: String(item?.default_selling_price || 0),
    low_stock_threshold: String(item?.low_stock_threshold || 5),
  });

  const handleSave = async () => {
    if (!item?.id || !businessId) return;
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("inventory_items").update({
        name: form.name.trim(),
        category: form.category || null,
        current_stock: parseInt(form.current_stock) || 0,
        weight_per_unit: parseFloat(form.weight_per_unit) || 0,
        default_selling_price: parseFloat(form.default_selling_price) || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      }).eq("id", item.id);
      if (error) throw error;
      toast.success("Item updated!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors active:scale-95">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Inventory
      </button>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 sm:p-5 flex items-center gap-2.5 border-b border-border">
          <span className="material-symbols-outlined text-primary text-xl">edit</span>
          <h3 className="font-bold text-base sm:text-lg">Edit Item</h3>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Item Name</label>
            <input className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Category</label>
            <input className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Current Stock</label>
              <input type="number" className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Weight/Unit (kg)</label>
              <input type="number" step="0.01" className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                value={form.weight_per_unit} onChange={(e) => setForm({ ...form, weight_per_unit: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Selling Price (৳)</label>
              <input type="number" className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                value={form.default_selling_price} onChange={(e) => setForm({ ...form, default_selling_price: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Low Stock Alert</label>
              <input type="number" className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all text-sm">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
