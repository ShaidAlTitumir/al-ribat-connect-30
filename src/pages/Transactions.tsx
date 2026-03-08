import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format } from "date-fns";

type TransactionTab = "list" | "send";

const METHODS = [
  { id: "bank", label: "Bank", icon: "account_balance" },
  { id: "bkash", label: "bKash", icon: "phone_android" },
  { id: "nagad", label: "Nagad", icon: "phone_android" },
  { id: "rocket", label: "Rocket", icon: "phone_android" },
  { id: "cash", label: "Cash", icon: "payments" },
  { id: "other", label: "Other", icon: "more_horiz" },
];

const Transactions = () => {
  const [activeTab, setActiveTab] = useState<TransactionTab>("list");

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Transactions" />
      {activeTab === "list" ? (
        <TransactionList onSend={() => setActiveTab("send")} />
      ) : (
        <SendMoney onBack={() => setActiveTab("list")} onSaved={() => setActiveTab("list")} />
      )}
    </div>
  );
};

/* ─── Transaction List ─── */
const TransactionList = ({ onSend }: { onSend: () => void }) => {
  const { businessId } = useBusiness();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    Promise.all([
      supabase.from("partner_transfers").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("partners").select("id, name").eq("business_id", businessId),
    ]).then(([{ data: t }, { data: p }]) => {
      setTransfers(t || []);
      setPartners(p || []);
      setLoading(false);
    });
  }, [businessId]);

  const getPartnerName = (id: string) => partners.find((p) => p.id === id)?.name || "Unknown";
  const getMethodInfo = (m: string) => METHODS.find((mt) => mt.id === m) || METHODS[5];

  const filtered = transfers.filter((t) => {
    const fromName = getPartnerName(t.from_partner_id).toLowerCase();
    const toName = getPartnerName(t.to_partner_id).toLowerCase();
    const matchesSearch = fromName.includes(search.toLowerCase()) || toName.includes(search.toLowerCase()) || (t.transaction_id || "").toLowerCase().includes(search.toLowerCase());
    const matchesMethod = filterMethod === "all" || t.method === filterMethod;
    return matchesSearch && matchesMethod;
  });

  const totalTransferred = transfers.reduce((sum, t) => sum + Number(t.amount), 0);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("partner_transfers").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setTransfers((prev) => prev.filter((t) => t.id !== id));
    toast.success("Transfer deleted");
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        <div className="bg-card p-4 lg:p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground text-xs lg:text-sm font-medium">Total Transfers</span>
            <span className="material-symbols-outlined text-primary text-[20px]">swap_horiz</span>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-foreground">{transfers.length}</div>
        </div>
        <div className="bg-card p-4 lg:p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground text-xs lg:text-sm font-medium">Total Amount</span>
            <span className="material-symbols-outlined text-emerald-500 text-[20px]">payments</span>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-foreground">৳{totalTransferred.toLocaleString()}</div>
        </div>
        <div className="bg-card p-4 lg:p-6 rounded-xl border border-border col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground text-xs lg:text-sm font-medium">Partners</span>
            <span className="material-symbols-outlined text-accent-foreground text-[20px]">group</span>
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-foreground">{partners.length}</div>
        </div>
      </section>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">search</span>
          <input
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
            placeholder="Search by partner or transaction ID..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {["all", ...METHODS.map((m) => m.id)].map((m) => (
            <button key={m} onClick={() => setFilterMethod(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterMethod === m ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
              }`}>
              {m === "all" ? "All" : METHODS.find((mt) => mt.id === m)?.label || m}
            </button>
          ))}
          <button onClick={onSend} className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold">
            <span className="material-symbols-outlined text-[18px]">send</span> Send
          </button>
        </div>
      </div>

      {/* Transfer List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
          <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl text-muted-foreground/50">swap_horiz</span>
          </div>
          <h3 className="text-lg font-bold mb-2 text-foreground">No transactions yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6 text-sm">Record your first partner-to-partner transfer.</p>
          <button onClick={onSend} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">send</span> Send Money
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const method = getMethodInfo(t.method);
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[20px]">{method.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-foreground text-sm">{getPartnerName(t.from_partner_id)}</span>
                      <span className="material-symbols-outlined text-muted-foreground text-[16px]">arrow_forward</span>
                      <span className="font-bold text-foreground text-sm">{getPartnerName(t.to_partner_id)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{method.label}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(t.created_at), "dd MMM yyyy, hh:mm a")}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-foreground">৳{Number(t.amount).toLocaleString()}</span>
                  </div>
                  <span className={`material-symbols-outlined text-muted-foreground text-[18px] transition-transform ${isExpanded ? "rotate-180" : ""}`}>expand_more</span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border">
                    <div className="grid grid-cols-2 gap-3 py-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">From</span>
                        <p className="font-semibold text-foreground">{getPartnerName(t.from_partner_id)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">To</span>
                        <p className="font-semibold text-foreground">{getPartnerName(t.to_partner_id)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Amount</span>
                        <p className="font-semibold text-foreground">৳{Number(t.amount).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Method</span>
                        <p className="font-semibold text-foreground">{method.label}</p>
                      </div>
                      {t.transaction_id && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground text-xs">Transaction ID</span>
                          <p className="font-semibold text-foreground font-mono text-xs">{t.transaction_id}</p>
                        </div>
                      )}
                      {t.notes && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground text-xs">Notes</span>
                          <p className="text-foreground text-sm">{t.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button onClick={() => handleDelete(t.id)}
                        className="flex items-center gap-1 text-destructive text-xs font-medium hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Send Money Form ─── */
const SendMoney = ({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) => {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [partners, setPartners] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fromPartnerId: "", toPartnerId: "", amount: "", method: "bank", transactionId: "", notes: "",
  });

  useEffect(() => {
    if (!businessId) return;
    supabase.from("partners").select("id, name").eq("business_id", businessId)
      .then(({ data }) => setPartners(data || []));
  }, [businessId]);

  const updateForm = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSend = async () => {
    if (!businessId || !user) return;
    if (!form.fromPartnerId) { toast.error("Select sender"); return; }
    if (!form.toPartnerId) { toast.error("Select receiver"); return; }
    if (form.fromPartnerId === form.toPartnerId) { toast.error("Sender and receiver must be different"); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("partner_transfers").insert({
        business_id: businessId,
        from_partner_id: form.fromPartnerId,
        to_partner_id: form.toPartnerId,
        amount,
        method: form.method,
        transaction_id: form.transactionId.trim() || null,
        notes: form.notes.trim() || null,
        user_id: user.id,
      });
      if (error) throw error;

      const fromName = partners.find((p) => p.id === form.fromPartnerId)?.name;
      const toName = partners.find((p) => p.id === form.toPartnerId)?.name;

      await supabase.from("activity_log").insert({
        action: "Partner transfer",
        details: {
          from: fromName,
          to: toName,
          amount,
          method: form.method,
          transaction_id: form.transactionId.trim() || undefined,
        },
        business_id: businessId,
        user_id: user.id,
      });

      toast.success("Transfer recorded!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const selectedMethod = METHODS.find((m) => m.id === form.method) || METHODS[0];

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full">
      <header className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back
        </button>
        <h2 className="text-xl lg:text-2xl font-black text-foreground">Send Money</h2>
      </header>

      <div className="space-y-6">
        {/* From & To */}
        <section className="bg-card rounded-xl p-4 lg:p-6 border border-border">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">people</span> Transfer Details
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">From (Sender)</label>
              <select className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground"
                value={form.fromPartnerId} onChange={(e) => updateForm("fromPartnerId", e.target.value)}>
                <option value="">Select sender...</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">arrow_downward</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">To (Receiver)</label>
              <select className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground"
                value={form.toPartnerId} onChange={(e) => updateForm("toPartnerId", e.target.value)}>
                <option value="">Select receiver...</option>
                {partners.filter((p) => p.id !== form.fromPartnerId).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Amount (BDT)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                <input className="pl-7 w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground text-lg font-bold"
                  type="number" placeholder="0.00" value={form.amount} onChange={(e) => updateForm("amount", e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* Payment Method */}
        <section className="bg-card rounded-xl p-4 lg:p-6 border border-border">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_balance</span> Payment Method
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            {METHODS.map((m) => (
              <button key={m.id} onClick={() => updateForm("method", m.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all ${
                  form.method === m.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted border border-border text-muted-foreground hover:border-primary/30"
                }`}>
                <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">
              Transaction ID <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input className="rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground font-mono text-sm"
              placeholder="e.g. TXN123456789" value={form.transactionId} onChange={(e) => updateForm("transactionId", e.target.value)} />
          </div>
        </section>

        {/* Notes */}
        <section className="bg-card rounded-xl p-4 lg:p-6 border border-border">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">notes</span> Notes
            <span className="text-muted-foreground text-sm font-normal">(optional)</span>
          </h3>
          <textarea className="w-full rounded-lg border border-border bg-muted px-4 py-2.5 text-foreground text-sm resize-none"
            rows={3} placeholder="Any additional details..." value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} />
        </section>

        {/* Summary & Submit */}
        {form.fromPartnerId && form.toPartnerId && form.amount && (
          <div className="bg-primary text-primary-foreground rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm opacity-80">Summary</span>
              <span className="bg-primary-foreground/20 px-2 py-0.5 rounded text-xs font-bold">{selectedMethod.label}</span>
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold">{partners.find((p) => p.id === form.fromPartnerId)?.name}</p>
              <span className="material-symbols-outlined text-[20px] opacity-60">arrow_downward</span>
              <p className="font-bold">{partners.find((p) => p.id === form.toPartnerId)?.name}</p>
              <p className="text-3xl font-black mt-2">৳{Number(form.amount || 0).toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 bg-card border border-border text-foreground font-semibold py-3 rounded-xl transition-colors hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleSend} disabled={saving}
            className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90">
            <span className="material-symbols-outlined">send</span>
            {saving ? "Sending..." : "Confirm & Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
