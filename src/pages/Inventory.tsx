import { useState } from "react";

type InventoryTab = "list" | "add";

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>("list");
  const [filter, setFilter] = useState("all");
  const [shippingMethod, setShippingMethod] = useState("sea");
  const [itemMode, setItemMode] = useState<"new" | "restock">("new");

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 lg:px-8 py-6 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Inventory</h1>
            <p className="text-muted-foreground text-sm">Manage and track your warehouse stock levels</p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === "list" ? (
              <button
                onClick={() => setActiveTab("add")}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Add Item</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab("list")}
                className="flex items-center gap-2 border border-border hover:bg-muted px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                <span>Back to List</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {activeTab === "list" ? <InventoryList filter={filter} setFilter={setFilter} onAdd={() => setActiveTab("add")} /> : <AddItem shippingMethod={shippingMethod} setShippingMethod={setShippingMethod} itemMode={itemMode} setItemMode={setItemMode} />}
    </div>
  );
};

/* ─── Inventory List View ─── */
const InventoryList = ({ filter, setFilter, onAdd }: { filter: string; setFilter: (f: string) => void; onAdd: () => void }) => (
  <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
    {/* Stock Summary Cards */}
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[
        { label: "Total Items", value: "0", icon: "inventory", iconColor: "text-primary", trend: null },
        { label: "Low Stock", value: "0", icon: "warning", iconColor: "text-amber-500", trend: "Requiring immediate attention" },
        { label: "Out of Stock", value: "0", icon: "error", iconColor: "text-destructive", trend: null },
      ].map((card) => (
        <div key={card.label} className="bg-card p-6 rounded-xl border border-border shadow-card flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground text-sm font-medium">{card.label}</span>
            <span className={`material-symbols-outlined ${card.iconColor}`}>{card.icon}</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{card.value}</div>
          {card.trend && (
            <div className="mt-4 flex items-center gap-1 text-muted-foreground text-xs">
              <span>{card.trend}</span>
            </div>
          )}
        </div>
      ))}
    </section>

    {/* Filters & Search */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="relative flex-1 max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">search</span>
        <input
          className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground"
          placeholder="Search inventory items..."
          type="text"
        />
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["all", "low", "categories"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border hover:border-primary/50 text-muted-foreground"
            }`}
          >
            {f === "all" ? "All Items" : f === "low" ? "Low Stock" : "Categories"}
            {f === "categories" && (
              <span className="material-symbols-outlined text-[16px] ml-1 align-middle">keyboard_arrow_down</span>
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Empty State */}
    <div className="bg-card rounded-2xl border border-border min-h-[400px] flex flex-col items-center justify-center p-12 text-center shadow-card">
      <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-5xl text-muted-foreground/50">inventory_2</span>
      </div>
      <h3 className="text-xl font-bold mb-2 text-foreground">No inventory yet</h3>
      <p className="text-muted-foreground max-w-sm mb-8">
        Your inventory list is currently empty. Get started by adding your first product or importing from a CSV file.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Add New Item</span>
        </button>
        <button className="flex items-center justify-center gap-2 bg-card border border-border hover:bg-muted px-6 py-2.5 rounded-lg font-semibold text-sm transition-all">
          <span className="material-symbols-outlined text-[20px]">file_upload</span>
          <span>Import List</span>
        </button>
      </div>
    </div>
  </div>
);

/* ─── Add / Restock Item View ─── */
const AddItem = ({
  shippingMethod,
  setShippingMethod,
  itemMode,
  setItemMode,
}: {
  shippingMethod: string;
  setShippingMethod: (m: string) => void;
  itemMode: "new" | "restock";
  setItemMode: (m: "new" | "restock") => void;
}) => (
  <div className="p-6 lg:p-8">
    <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground">Add / Restock Item</h2>
        <p className="text-muted-foreground mt-1">Manage your warehouse stock and pricing details.</p>
      </div>
      <div className="bg-card border border-border p-1 rounded-xl flex">
        <button
          onClick={() => setItemMode("new")}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
            itemMode === "new" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          New Item
        </button>
        <button
          onClick={() => setItemMode("restock")}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
            itemMode === "restock" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Restock
        </button>
      </div>
    </header>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div className="xl:col-span-2 space-y-6">
        {/* Product Information */}
        <section className="bg-card rounded-xl p-6 border border-border shadow-card">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span>
            Product Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Item Name</label>
              <input className="rounded-lg border border-border bg-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all px-4 py-2.5 text-foreground" placeholder="e.g. Wireless Noise Cancelling Headphones" type="text" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Category</label>
              <select className="rounded-lg border border-border bg-muted focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2.5 text-foreground">
                <option>Electronics</option>
                <option>Fashion</option>
                <option>Home Decor</option>
                <option>Accessories</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Quantity</label>
              <input className="rounded-lg border border-border bg-muted focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2.5 text-foreground" placeholder="0" type="number" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Weight (kg)</label>
              <input className="rounded-lg border border-border bg-muted focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2.5 text-foreground" placeholder="0.00" step="0.01" type="number" />
            </div>
          </div>
        </section>

        {/* Costing & Shipping */}
        <section className="bg-card rounded-xl p-6 border border-border shadow-card">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            Costing &amp; Shipping
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Buying Cost (RMB)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                <input className="pl-7 w-full rounded-lg border border-border bg-muted focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2.5 text-foreground" placeholder="0.00" type="number" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Shipping Method</label>
              <div className="flex p-1 bg-muted rounded-lg border border-border">
                {["sea", "air", "luggage"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setShippingMethod(m)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${
                      shippingMethod === m ? "bg-card shadow-sm border border-border text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Shipping Rate (per kg)</label>
              <input className="rounded-lg border border-border bg-muted focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2.5 text-foreground" placeholder="0.00" type="number" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Additional Cost (per unit)</label>
              <input className="rounded-lg border border-border bg-muted focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2.5 text-foreground" placeholder="0.00" type="number" />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-foreground">Target Selling Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input className="pl-7 w-full rounded-lg border border-border bg-muted focus:border-primary focus:ring-2 focus:ring-primary/20 px-4 py-2.5 text-foreground" placeholder="0.00" type="number" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Profit Analysis Sidebar */}
      <div className="space-y-6">
        <div className="bg-primary text-primary-foreground rounded-xl p-6 shadow-lg sticky top-24">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined">calculate</span>
            Profit Analysis
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-white/20">
              <span className="text-white/80 text-sm">Landed Cost (Total)</span>
              <span className="font-bold text-xl">$0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-sm">Cost Per Unit</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-sm">Shipping Cost</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-sm">Potential Profit</span>
              <span className="font-medium text-emerald-300">+$0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-sm">Profit Margin</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">0%</span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/20">
            <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">save</span>
              Save Item to Inventory
            </button>
            <button className="w-full mt-3 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all">
              Cancel &amp; Discard
            </button>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h4 className="text-sm font-bold mb-4 text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-muted-foreground">help_outline</span>
            Quick Tips
          </h4>
          <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Buying cost is converted from RMB to your local currency based on today's rate.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Shipping costs are calculated based on weight and the selected shipping method.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Ensure all weights are in Kilograms (kg) for accurate shipping estimates.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

export default Inventory;
