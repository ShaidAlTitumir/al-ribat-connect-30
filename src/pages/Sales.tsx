import { useState } from "react";

const Sales = () => {
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const total = quantity * (parseFloat(unitPrice) || 0);
  const due = total - (parseFloat(receivedAmount) || 0);
  const profit = total - quantity * 16; // placeholder cost rate

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Record Sale</h1>
          <p className="text-muted-foreground mt-1">Create a new transaction and update inventory</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-card transition-all">
            Cancel
          </button>
          <button className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Save Sale
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sale Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Information */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_basket</span>
              Item Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="block text-sm font-semibold text-foreground mb-2">Select Item</label>
                <select className="w-full h-12 bg-muted border border-border rounded-lg px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground">
                  <option value="">Search for an item in inventory...</option>
                  <option value="1">Wireless Headphones (24 in stock)</option>
                  <option value="2">Mechanical Keyboard (12 in stock)</option>
                  <option value="3">USB-C Hub (45 in stock)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full h-12 bg-muted border border-border rounded-lg px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Unit Price ($)</label>
                <input
                  type="text"
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full h-12 bg-muted border border-border rounded-lg px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Cost Rate (Auto)</label>
                <div className="w-full h-12 bg-muted/80 border border-border rounded-lg px-4 flex items-center text-muted-foreground font-medium">
                  16.00
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Received Amount ($)</label>
                <input
                  type="text"
                  placeholder="Amount paid now"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="w-full h-12 bg-muted border border-border rounded-lg px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person</span>
              Customer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Customer Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-12 bg-muted border border-border rounded-lg px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full h-12 bg-muted border border-border rounded-lg px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Recent Sales */}
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">Recent Sales</h3>
            <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-muted-foreground text-3xl">history</span>
              </div>
              <p className="font-bold text-foreground">No recent sales yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                New sales you record today will appear here for quick reference.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-primary text-primary-foreground p-6 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold uppercase tracking-wider opacity-80 mb-6">Sale Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-sm opacity-90">Total Amount</span>
                <span className="text-xl font-black">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-sm opacity-90">Amount Due</span>
                <span className="text-xl font-black">${Math.max(0, due).toFixed(2)}</span>
              </div>
              <div className="bg-white/10 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span className="text-sm font-medium">Expected Profit</span>
                  </div>
                  <span className="text-lg font-bold">${profit > 0 ? profit.toFixed(2) : "0.00"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <h4 className="font-bold text-sm mb-4">Quick Tips</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-emerald-500 text-lg">info</span>
                <span>Sales are automatically deducted from inventory.</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-emerald-500 text-lg">info</span>
                <span>Profit is calculated based on current cost rate.</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-emerald-500 text-lg">info</span>
                <span>Unpaid amounts will be added to customer's credit history.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;
