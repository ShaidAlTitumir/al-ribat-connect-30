import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format } from "date-fns";

const Returns = () => {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [returnQty, setReturnQty] = useState(1);
  const [refundAmount, setRefundAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    const [salesRes, returnsRes] = await Promise.all([
      supabase.from("sales")
        .select("id, quantity, unit_price_bdt, received_now_bdt, due, customer_id, item_id, created_at, inventory_items(name), customers(name)")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("returns")
        .select("*, inventory_items(name), customers(name)")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false }),
    ]);
    setSales(salesRes.data || []);
    setReturns(returnsRes.data || []);
  };

  const selectedSale = sales.find(s => s.id === selectedSaleId);
  const maxRefund = selectedSale ? selectedSale.unit_price_bdt * returnQty : 0;

  const handleReturn = async () => {
    if (!businessId || !user || !selectedSaleId || !selectedSale) return;
    if (returnQty <= 0) { toast.error("Return quantity must be > 0"); return; }
    if (returnQty > selectedSale.quantity) { toast.error(`Max returnable: ${selectedSale.quantity}`); return; }

    const refund = parseFloat(refundAmount) || 0;
    if (refund > maxRefund) { toast.error(`Max refund: ৳${maxRefund}`); return; }

    setSaving(true);
    try {
      // 1. Insert return record
      await supabase.from("returns").insert({
        business_id: businessId,
        user_id: user.id,
        sale_id: selectedSaleId,
        item_id: selectedSale.item_id,
        customer_id: selectedSale.customer_id,
        quantity: returnQty,
        refund_amount: refund,
        reason: reason.trim() || null,
      });

      // 2. Restore inventory stock
      const { data: item } = await supabase.from("inventory_items")
        .select("current_stock")
        .eq("id", selectedSale.item_id)
        .single();
      if (item) {
        await supabase.from("inventory_items")
          .update({ current_stock: item.current_stock + returnQty })
          .eq("id", selectedSale.item_id);
      }

      // 3. Reduce customer due if applicable
      if (selectedSale.customer_id && refund > 0) {
        const { data: cust } = await supabase.from("customers")
          .select("total_due")
          .eq("id", selectedSale.customer_id)
          .single();
        if (cust) {
          const newDue = Math.max(0, cust.total_due - refund);
          await supabase.from("customers")
            .update({ total_due: newDue })
            .eq("id", selectedSale.customer_id);
        }

        // Add ledger entry
        await supabase.from("customer_ledger").insert({
          customer_id: selectedSale.customer_id,
          transaction_type: "refund",
          amount: -refund,
          reference_id: selectedSaleId,
          business_id: businessId,
          user_id: user.id,
        });
      }

      // 4. Log activity
      await supabase.from("activity_log").insert({
        action: "Processed return",
        details: {
          item_name: (selectedSale as any).inventory_items?.name,
          quantity: returnQty,
          refund,
          reason: reason.trim() || "No reason",
          customer_name: (selectedSale as any).customers?.name || "Walk-in",
        },
        business_id: businessId,
        user_id: user.id,
      });

      toast.success("Return processed successfully!");
      setSelectedSaleId("");
      setReturnQty(1);
      setRefundAmount("");
      setReason("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Returns & Refunds" />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Process Return Form */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">assignment_return</span>
                Process Return
              </h3>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Select Sale</label>
                <select value={selectedSaleId} onChange={e => setSelectedSaleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                  <option value="">-- Choose a sale --</option>
                  {sales.map(s => (
                    <option key={s.id} value={s.id}>
                      {(s as any).inventory_items?.name} × {s.quantity} — ৳{s.unit_price_bdt * s.quantity} ({format(new Date(s.created_at), "dd MMM")})
                    </option>
                  ))}
                </select>
              </div>

              {selectedSale && (
                <>
                  <div className="bg-muted rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Item</span>
                      <span className="font-bold">{(selectedSale as any).inventory_items?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-bold">{(selectedSale as any).customers?.name || "Walk-in"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Original Qty</span>
                      <span className="font-bold">{selectedSale.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unit Price</span>
                      <span className="font-bold">৳{selectedSale.unit_price_bdt}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Return Quantity</label>
                    <input type="number" value={returnQty} min={1} max={selectedSale.quantity}
                      onChange={e => setReturnQty(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">
                      Refund Amount <span className="text-muted-foreground font-normal">(max ৳{maxRefund})</span>
                    </label>
                    <input type="number" value={refundAmount} placeholder="0"
                      onChange={e => setRefundAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Reason (optional)</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                      placeholder="Damaged, wrong item, etc."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none" />
                  </div>

                  <button onClick={handleReturn} disabled={saving}
                    className="w-full bg-destructive text-destructive-foreground font-bold py-2.5 rounded-lg hover:bg-destructive/90 disabled:opacity-50">
                    {saving ? "Processing..." : `Process Return (${returnQty} items)`}
                  </button>
                </>
              )}
            </div>

            {/* Return History */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-xl border border-border h-full flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-lg font-bold">Return History</h3>
                  <span className="text-xs font-medium text-muted-foreground">{returns.length} records</span>
                </div>
                {returns.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-muted-foreground/30 mb-2">assignment_return</span>
                    <p className="font-bold text-foreground">No returns yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Process a return to see it here.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-border">
                    {returns.map((r: any) => (
                      <div key={r.id} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-destructive text-[18px]">undo</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{r.inventory_items?.name || "Item"} × {r.quantity}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {r.customers?.name || "Walk-in"} • {format(new Date(r.created_at), "dd MMM yyyy, h:mm a")}
                              </p>
                              {r.reason && <p className="text-[10px] text-muted-foreground italic mt-0.5">"{r.reason}"</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-bold text-destructive">-৳{Number(r.refund_amount).toLocaleString("en-IN")}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{r.status}</span>
                            </div>
                            <button onClick={async () => {
                              setDeletingId(r.id);
                              try {
                                // Reverse: reduce stock
                                const { data: item } = await supabase.from("inventory_items").select("current_stock").eq("id", r.item_id).single();
                                if (item) await supabase.from("inventory_items").update({ current_stock: Math.max(0, item.current_stock - r.quantity) }).eq("id", r.item_id);
                                // Reverse: restore customer due
                                if (r.customer_id && r.refund_amount > 0) {
                                  const { data: cust } = await supabase.from("customers").select("total_due").eq("id", r.customer_id).single();
                                  if (cust) await supabase.from("customers").update({ total_due: cust.total_due + r.refund_amount }).eq("id", r.customer_id);
                                }
                                await supabase.from("returns").delete().eq("id", r.id);
                                toast.success("Return reversed and deleted");
                                fetchData();
                              } catch (err: any) { toast.error(err.message); }
                              finally { setDeletingId(null); }
                            }}
                              disabled={deletingId === r.id}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50" title="Delete & Reverse">
                              <span className="material-symbols-outlined text-[18px]">{deletingId === r.id ? "hourglass_empty" : "delete"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Returns;
