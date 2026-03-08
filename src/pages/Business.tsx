import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";

interface BusinessData {
  id: string;
  name: string;
  business_type: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  manual_value: number | null;
  owner_id: string | null;
  exchange_rate: number;
  created_at: string;
}

interface DeletionRequest {
  id: string;
  business_id: string;
  requested_by: string;
  status: string;
  created_at: string;
}

interface DeletionVote {
  id: string;
  request_id: string;
  user_id: string;
  vote: string;
  voted_at: string | null;
}

interface MonthlyData {
  month: string;
  sales: number;
  profit: number;
  expenses: number;
}

interface BusinessStats {
  totalSalesRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  inventoryItems: number;
  totalStock: number;
  totalDue: number;
  customerCount: number;
  totalCapital: number;
  monthlyData: MonthlyData[];
}

const Business = () => {
  const { user } = useAuth();
  const { businessId, switchBusiness } = useBusiness();
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerCounts, setPartnerCounts] = useState<Record<string, number>>({});
  const [deletionRequests, setDeletionRequests] = useState<Record<string, DeletionRequest>>({});
  const [deletionVotes, setDeletionVotes] = useState<Record<string, DeletionVote[]>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [businessStats, setBusinessStats] = useState<Record<string, BusinessStats>>({});

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formManualValue, setFormManualValue] = useState("");

  useEffect(() => {
    if (user) fetchBusinesses();
  }, [user]);

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data: memberOf } = await (supabase
      .from("business_members")
      .select("business_id") as any)
      .eq("user_id", user!.id);

    const memberIds = (memberOf || []).map((m: any) => m.business_id);
    const allIds = new Set<string>();
    if (businessId) allIds.add(businessId);
    memberIds.forEach((id: string) => allIds.add(id));

    const { data } = await (supabase
      .from("businesses")
      .select("*") as any)
      .or(`owner_id.eq.${user!.id}${allIds.size > 0 ? `,id.in.(${Array.from(allIds).join(",")})` : ""}`);

    const bizList = (data as BusinessData[]) || [];
    setBusinesses(bizList);

    // Fetch partner counts and deletion requests for each business
    const bizIds = bizList.map(b => b.id);
    if (bizIds.length > 0) {
      // Partner counts
      const { data: partners } = await (supabase
        .from("partners")
        .select("business_id") as any)
        .in("business_id", bizIds)
        .eq("status", "accepted");
      
      const counts: Record<string, number> = {};
      (partners || []).forEach((p: any) => {
        counts[p.business_id] = (counts[p.business_id] || 0) + 1;
      });
      setPartnerCounts(counts);

      // Deletion requests
      const { data: requests } = await (supabase
        .from("business_deletion_requests")
        .select("*") as any)
        .in("business_id", bizIds)
        .eq("status", "pending");

      const reqMap: Record<string, DeletionRequest> = {};
      (requests || []).forEach((r: any) => {
        reqMap[r.business_id] = r;
      });
      setDeletionRequests(reqMap);

      // Votes for pending requests
      const requestIds = (requests || []).map((r: any) => r.id);
      if (requestIds.length > 0) {
        const { data: votes } = await (supabase
          .from("business_deletion_votes")
          .select("*") as any)
          .in("request_id", requestIds);

        const voteMap: Record<string, DeletionVote[]> = {};
        (votes || []).forEach((v: any) => {
          if (!voteMap[v.request_id]) voteMap[v.request_id] = [];
          voteMap[v.request_id].push(v);
        });
        setDeletionVotes(voteMap);
      } else {
        setDeletionVotes({});
      }
    }

    setLoading(false);
  };

  const fetchBusinessStats = async (bizId: string) => {
    if (businessStats[bizId]) return; // already fetched

    const [salesRes, expensesRes, inventoryRes, customersRes, capitalRes] = await Promise.all([
      (supabase.from("sales").select("received_now_bdt, expected_profit, unit_price_bdt, quantity, created_at") as any)
        .eq("business_id", bizId),
      (supabase.from("expenses").select("amount, currency, created_at") as any)
        .eq("business_id", bizId),
      (supabase.from("inventory_items").select("id, current_stock") as any)
        .eq("business_id", bizId),
      (supabase.from("customers").select("id, total_due") as any)
        .eq("business_id", bizId),
      (supabase.from("capital_contributions").select("amount, currency") as any)
        .eq("business_id", bizId),
    ]);

    const sales = salesRes.data || [];
    const expenses = expensesRes.data || [];
    const inventory = inventoryRes.data || [];
    const customers = customersRes.data || [];
    const capital = capitalRes.data || [];

    const totalSalesRevenue = sales.reduce((s: number, r: any) => s + Number(r.unit_price_bdt) * Number(r.quantity), 0);
    const totalProfit = sales.reduce((s: number, r: any) => s + Number(r.expected_profit), 0);
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
    const totalStock = inventory.reduce((s: number, i: any) => s + Number(i.current_stock), 0);
    const totalDue = customers.reduce((s: number, c: any) => s + Number(c.total_due), 0);
    const totalCapital = capital.reduce((s: number, c: any) => s + Number(c.amount), 0);

    // Build monthly data for last 6 months
    const now = new Date();
    const monthlyData: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const label = format(monthDate, "MMM yy");

      const monthSales = sales.filter((s: any) => {
        const d = new Date(s.created_at);
        return d >= mStart && d <= mEnd;
      });
      const monthExpenses = expenses.filter((e: any) => {
        const d = new Date(e.created_at);
        return d >= mStart && d <= mEnd;
      });

      monthlyData.push({
        month: label,
        sales: monthSales.reduce((s: number, r: any) => s + Number(r.unit_price_bdt) * Number(r.quantity), 0),
        profit: monthSales.reduce((s: number, r: any) => s + Number(r.expected_profit), 0),
        expenses: monthExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0),
      });
    }

    setBusinessStats(prev => ({
      ...prev,
      [bizId]: {
        totalSalesRevenue,
        totalExpenses,
        totalProfit,
        inventoryItems: inventory.length,
        totalStock,
        totalDue,
        customerCount: customers.length,
        totalCapital,
        monthlyData,
      }
    }));
  };

  const toggleExpand = (bizId: string) => {
    if (expandedId === bizId) {
      setExpandedId(null);
    } else {
      setExpandedId(bizId);
      fetchBusinessStats(bizId);
    }
  };

  const resetForm = () => {
    setFormName(""); setFormType(""); setFormDescription("");
    setFormAddress(""); setFormPhone(""); setFormManualValue("");
    setShowCreate(false); setEditingId(null);
  };

  const loadFormForEdit = (b: BusinessData) => {
    setFormName(b.name);
    setFormType(b.business_type || "");
    setFormDescription(b.description || "");
    setFormAddress(b.address || "");
    setFormPhone(b.phone || "");
    setFormManualValue(b.manual_value ? String(b.manual_value) : "");
    setEditingId(b.id);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!user || !formName.trim()) { toast.error("Business name is required"); return; }

    if (editingId) {
      const { error } = await (supabase.from("businesses") as any)
        .update({
          name: formName.trim(),
          business_type: formType.trim() || null,
          description: formDescription.trim() || null,
          address: formAddress.trim() || null,
          phone: formPhone.trim() || null,
          manual_value: formManualValue ? parseFloat(formManualValue) : null,
        })
        .eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Business updated!");
    } else {
      const { data, error } = await (supabase.from("businesses") as any)
        .insert({
          name: formName.trim(),
          business_type: formType.trim() || null,
          description: formDescription.trim() || null,
          address: formAddress.trim() || null,
          phone: formPhone.trim() || null,
          manual_value: formManualValue ? parseFloat(formManualValue) : null,
          owner_id: user.id,
        })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }

      await (supabase.from("business_members") as any).insert({
        user_id: user.id,
        business_id: data.id,
        role: "owner",
      });

      toast.success("Business created!");
    }
    resetForm();
    fetchBusinesses();
  };

  const handleSelect = async (id: string) => {
    if (!user) return;
    await supabase.from("profiles")
      .update({ business_id: id })
      .eq("user_id", user.id);
    switchBusiness(id);
    toast.success("Switched business!");
  };

  // Delete business (no partners — immediate delete)
  const handleDeleteDirect = async (b: BusinessData) => {
    if (deleteConfirmText !== b.name.toUpperCase()) {
      toast.error("Please type the business name in UPPERCASE to confirm");
      return;
    }
    // Delete related data first to avoid foreign key constraint violations
    await supabase.from("profiles").update({ business_id: null }).eq("business_id", b.id);
    await supabase.from("business_members").delete().eq("business_id", b.id);
    await supabase.from("customer_ledger").delete().eq("business_id", b.id);
    await supabase.from("returns").delete().eq("business_id", b.id);
    await supabase.from("sales").delete().eq("business_id", b.id);
    await supabase.from("purchase_transactions").delete().eq("business_id", b.id);
    await supabase.from("exchanges").delete().eq("business_id", b.id);
    await supabase.from("partner_transfers").delete().eq("business_id", b.id);
    await supabase.from("capital_contributions").delete().eq("business_id", b.id);
    await supabase.from("expenses").delete().eq("business_id", b.id);
    await supabase.from("activity_log").delete().eq("business_id", b.id);
    await supabase.from("customers").delete().eq("business_id", b.id);
    await supabase.from("inventory_items").delete().eq("business_id", b.id);
    await supabase.from("partners").delete().eq("business_id", b.id);
    await supabase.from("notifications").delete().eq("business_id", b.id);
    // Delete votes before requests (FK constraint: votes -> requests)
    const { data: delReqs } = await supabase.from("business_deletion_requests").select("id").eq("business_id", b.id);
    if (delReqs && delReqs.length > 0) {
      for (const dr of delReqs) {
        await supabase.from("business_deletion_votes").delete().eq("request_id", dr.id);
      }
    }
    await supabase.from("business_deletion_requests").delete().eq("business_id", b.id);
    const { error } = await supabase.from("businesses").delete().eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    
    // If this was the active business, clear it
    if (b.id === businessId && user) {
      await supabase.from("profiles").update({ business_id: null }).eq("user_id", user.id);
      switchBusiness("");
    }
    toast.success("Business deleted permanently");
    setConfirmDeleteId(null);
    setDeleteConfirmText("");
    fetchBusinesses();
  };

  // Request deletion (has partners — needs approval)
  const handleRequestDeletion = async (b: BusinessData) => {
    if (!user) return;
    // Create deletion request
    const { data: req, error } = await (supabase
      .from("business_deletion_requests")
      .insert({ business_id: b.id, requested_by: user.id }) as any)
      .select()
      .single();
    if (error) { toast.error(error.message); return; }

    // Get all accepted partners with user_ids (excluding requester)
    const { data: partners } = await (supabase
      .from("partners")
      .select("user_id") as any)
      .eq("business_id", b.id)
      .eq("status", "accepted")
      .not("user_id", "is", null);

    const partnerUserIds = (partners || [])
      .map((p: any) => p.user_id)
      .filter((uid: string) => uid !== user.id);

    // Create vote entries for each partner
    if (partnerUserIds.length > 0) {
      const voteInserts = partnerUserIds.map((uid: string) => ({
        request_id: req.id,
        user_id: uid,
        vote: "pending",
      }));
      await (supabase.from("business_deletion_votes") as any).insert(voteInserts);

      // Also auto-approve for the requester
      await (supabase.from("business_deletion_votes") as any).insert({
        request_id: req.id,
        user_id: user.id,
        vote: "approved",
        voted_at: new Date().toISOString(),
      });

      // Send notifications to all partners
      const notifInserts = partnerUserIds.map((uid: string) => ({
        user_id: uid,
        business_id: b.id,
        title: "Business Deletion Request",
        message: `A request to delete "${b.name}" has been submitted. Your approval is required.`,
        type: "deletion_request",
      }));
      await (supabase.from("notifications") as any).insert(notifInserts);
    }

    toast.success("Deletion request sent to all partners for approval");
    setConfirmDeleteId(null);
    setDeleteConfirmText("");
    fetchBusinesses();
  };

  // Vote on a deletion request
  const handleVote = async (requestId: string, vote: "approved" | "rejected") => {
    if (!user) return;

    await (supabase.from("business_deletion_votes") as any)
      .update({ vote, voted_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .eq("user_id", user.id);

    if (vote === "rejected") {
      // Cancel the whole request
      const { data: reqData } = await (supabase
        .from("business_deletion_requests")
        .select("business_id, requested_by") as any)
        .eq("id", requestId)
        .single();

      await (supabase.from("business_deletion_requests") as any)
        .update({ status: "rejected" })
        .eq("id", requestId);

      // Notify requester
      if (reqData && reqData.requested_by !== user.id) {
        const biz = businesses.find(b => b.id === reqData.business_id);
        await (supabase.from("notifications") as any).insert({
          user_id: reqData.requested_by,
          business_id: reqData.business_id,
          title: "Deletion Request Rejected",
          message: `A partner rejected the deletion request for "${biz?.name || "your business"}".`,
          type: "deletion_request",
        });
      }

      toast.info("You rejected the deletion request");
    } else {
      // Check if all partners approved
      const { data: allVotes } = await (supabase
        .from("business_deletion_votes")
        .select("*") as any)
        .eq("request_id", requestId);

      const allApproved = (allVotes || []).every((v: any) => v.vote === "approved");
      if (allApproved) {
        // Get the business_id from the request
        const { data: req } = await (supabase
          .from("business_deletion_requests")
          .select("business_id") as any)
          .eq("id", requestId)
          .single();

        if (req) {
          // Notify all members that business is deleted
          const { data: members } = await (supabase
            .from("business_members")
            .select("user_id") as any)
            .eq("business_id", req.business_id);
          
          const biz = businesses.find(b => b.id === req.business_id);
          const memberNotifs = (members || [])
            .filter((m: any) => m.user_id !== user.id)
            .map((m: any) => ({
              user_id: m.user_id,
              business_id: req.business_id,
              title: "Business Deleted",
              message: `"${biz?.name || "A business"}" has been permanently deleted after all partners approved.`,
              type: "deletion_request",
            }));
          if (memberNotifs.length > 0) {
            await (supabase.from("notifications") as any).insert(memberNotifs);
          }

          // Clean up related data then delete the business
          const bid = req.business_id;
          await supabase.from("profiles").update({ business_id: null }).eq("business_id", bid);
          await supabase.from("business_members").delete().eq("business_id", bid);
          await supabase.from("customer_ledger").delete().eq("business_id", bid);
          await supabase.from("returns").delete().eq("business_id", bid);
          await supabase.from("sales").delete().eq("business_id", bid);
          await supabase.from("purchase_transactions").delete().eq("business_id", bid);
          await supabase.from("exchanges").delete().eq("business_id", bid);
          await supabase.from("partner_transfers").delete().eq("business_id", bid);
          await supabase.from("capital_contributions").delete().eq("business_id", bid);
          await supabase.from("expenses").delete().eq("business_id", bid);
          await supabase.from("activity_log").delete().eq("business_id", bid);
          await supabase.from("customers").delete().eq("business_id", bid);
          await supabase.from("inventory_items").delete().eq("business_id", bid);
          await supabase.from("partners").delete().eq("business_id", bid);
          await supabase.from("notifications").delete().eq("business_id", bid);
          // Delete votes before requests (FK constraint: votes -> requests)
          const { data: delReqs2 } = await supabase.from("business_deletion_requests").select("id").eq("business_id", bid);
          if (delReqs2 && delReqs2.length > 0) {
            for (const dr of delReqs2) {
              await supabase.from("business_deletion_votes").delete().eq("request_id", dr.id);
            }
          }
          await supabase.from("business_deletion_requests").delete().eq("business_id", bid);
          await supabase.from("businesses").delete().eq("id", bid);

          if (req.business_id === businessId && user) {
            await supabase.from("profiles").update({ business_id: null }).eq("user_id", user.id);
            switchBusiness("");
          }
          toast.success("All partners approved — business deleted");
        }
      } else {
        // Notify requester about the approval
        const { data: reqData } = await (supabase
          .from("business_deletion_requests")
          .select("business_id, requested_by") as any)
          .eq("id", requestId)
          .single();
        
        if (reqData && reqData.requested_by !== user.id) {
          const biz = businesses.find(b => b.id === reqData.business_id);
          await (supabase.from("notifications") as any).insert({
            user_id: reqData.requested_by,
            business_id: reqData.business_id,
            title: "Partner Approved Deletion",
            message: `A partner approved the deletion of "${biz?.name || "your business"}". Waiting for remaining approvals.`,
            type: "deletion_request",
          });
        }
        toast.success("Your approval recorded. Waiting for other partners.");
      }
    }
    fetchBusinesses();
  };

  // Cancel own deletion request
  const handleCancelRequest = async (requestId: string) => {
    await (supabase.from("business_deletion_requests") as any)
      .update({ status: "cancelled" })
      .eq("id", requestId);
    toast.info("Deletion request cancelled");
    fetchBusinesses();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="My Businesses" />
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Your Businesses</h2>
            <p className="text-sm text-muted-foreground">Create, manage, and switch between your businesses.</p>
          </div>
          {!showCreate && (
            <button
              onClick={() => { resetForm(); setShowCreate(true); }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Business
            </button>
          )}
        </div>

        {/* Create / Edit Form */}
        {showCreate && (
          <section className="bg-card p-5 rounded-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {editingId ? "edit" : "domain_add"}
                </span>
                {editingId ? "Edit Business" : "Create New Business"}
              </h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-muted">
                <span className="material-symbols-outlined text-muted-foreground text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Business Name *</label>
                <input className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border-none text-foreground"
                  placeholder="e.g. Al-Ribat Trading" value={formName}
                  onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Business Mode</label>
                <div className="flex p-1 bg-muted rounded-lg border border-border">
                  {[{ value: "solo", label: "Solo" }, { value: "", label: "Partnership" }].map((m) => (
                    <button key={m.value} type="button" onClick={() => setFormType(m.value)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                        (formType.toLowerCase() === "solo" ? "solo" : "") === m.value
                          ? "bg-card shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >{m.label}</button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formType.toLowerCase() === "solo" ? "Simplified mode — no partners, exchange, or import features" : "Full features including partners, exchange, and China imports"}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Phone</label>
                <input className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border-none text-foreground"
                  placeholder="+880..." value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Address</label>
                <input className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border-none text-foreground"
                  placeholder="Business address" value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                <textarea className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border-none text-foreground resize-none"
                  rows={2} placeholder="Brief description of your business" value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Manual Valuation (৳)</label>
                <input className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border-none text-foreground"
                  type="number" placeholder="Optional override" value={formManualValue}
                  onChange={(e) => setFormManualValue(e.target.value)} />
                <p className="text-[10px] text-muted-foreground">Leave empty to use auto-calculated value.</p>
              </div>
            </div>

            <button onClick={handleSave}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base">
                {editingId ? "save" : "add_business"}
              </span>
              {editingId ? "Save Changes" : "Create Business"}
            </button>
          </section>
        )}

        {/* Business List */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-muted-foreground/40 mb-2 block">storefront</span>
            <h4 className="font-bold text-lg mb-1">No businesses yet</h4>
            <p className="text-sm text-muted-foreground mb-4">Create your first business to get started.</p>
            <button onClick={() => setShowCreate(true)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold text-sm">
              Create Business
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.map((b) => {
              const isActive = b.id === businessId;
              const isOwner = b.owner_id === user?.id;
              const partnerCount = partnerCounts[b.id] || 0;
              const hasPartners = partnerCount > 1; // more than just self
              const pendingRequest = deletionRequests[b.id];
              const votes = pendingRequest ? (deletionVotes[pendingRequest.id] || []) : [];
              const myVote = votes.find(v => v.user_id === user?.id);
              const approvedCount = votes.filter(v => v.vote === "approved").length;
              const totalVotes = votes.length;
              const isRequester = pendingRequest?.requested_by === user?.id;

              return (
                <div key={b.id}
                  className={`bg-card rounded-xl border p-4 lg:p-5 transition-all ${
                    isActive ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <span className="material-symbols-outlined text-xl">storefront</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground truncate">{b.name}</h4>
                          {isActive && (
                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                              ACTIVE
                            </span>
                          )}
                          {isOwner && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full shrink-0">
                              OWNER
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          b.business_type?.toLowerCase() === "solo"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}>
                          {b.business_type?.toLowerCase() === "solo" ? "SOLO" : "PARTNERSHIP"}
                        </span>
                        {b.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{b.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {b.address && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">location_on</span>
                              {b.address}
                            </span>
                          )}
                          {b.phone && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">call</span>
                              {b.phone}
                            </span>
                          )}
                          {b.manual_value != null && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">paid</span>
                              ৳{Number(b.manual_value).toLocaleString("en-IN")}
                            </span>
                          )}
                          {partnerCount > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">group</span>
                              {partnerCount} partner{partnerCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner && (
                        <button onClick={() => loadFormForEdit(b)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Edit">
                          <span className="material-symbols-outlined text-muted-foreground text-[18px]">edit</span>
                        </button>
                      )}
                      {isOwner && !pendingRequest && (
                        <button onClick={() => { setConfirmDeleteId(b.id); setDeleteConfirmText(""); }}
                          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                          title="Delete Business">
                          <span className="material-symbols-outlined text-destructive text-[18px]">delete</span>
                        </button>
                      )}
                      {!isActive && (
                        <button onClick={() => handleSelect(b.id)}
                          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90">
                          Switch
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse toggle */}
                  <button
                    onClick={() => toggleExpand(b.id)}
                    className="w-full mt-2 flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {expandedId === b.id ? "expand_less" : "expand_more"}
                    </span>
                    {expandedId === b.id ? "Show less" : "View details"}
                  </button>

                  {/* Expanded details panel */}
                  {expandedId === b.id && (() => {
                    const stats = businessStats[b.id];
                    const netProfit = stats ? stats.totalProfit : 0;
                    const bizValue = b.manual_value != null
                      ? Number(b.manual_value)
                      : (stats ? stats.totalCapital + netProfit : 0);

                    return (
                      <div className="mt-2 border border-border rounded-lg bg-muted/30 p-4 space-y-4">
                        {!stats ? (
                          <div className="flex items-center justify-center py-4">
                            <span className="text-xs text-muted-foreground">Loading stats...</span>
                          </div>
                        ) : (
                          <>
                            {/* Key metrics grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="bg-card rounded-lg p-3 border border-border">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="material-symbols-outlined text-primary text-[16px]">account_balance</span>
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Business Value</span>
                                </div>
                                <p className="text-sm font-bold text-foreground">৳{bizValue.toLocaleString("en-IN")}</p>
                                {b.manual_value != null && (
                                  <p className="text-[9px] text-muted-foreground">Manual estimate</p>
                                )}
                              </div>
                              <div className="bg-card rounded-lg p-3 border border-border">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="material-symbols-outlined text-emerald-500 text-[16px]">trending_up</span>
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Net Profit</span>
                                </div>
                                <p className={`text-sm font-bold ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                                  {netProfit >= 0 ? "+" : ""}৳{netProfit.toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div className="bg-card rounded-lg p-3 border border-border">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="material-symbols-outlined text-primary text-[16px]">shopping_cart</span>
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Sales</span>
                                </div>
                                <p className="text-sm font-bold text-foreground">৳{stats.totalSalesRevenue.toLocaleString("en-IN")}</p>
                              </div>
                              <div className="bg-card rounded-lg p-3 border border-border">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="material-symbols-outlined text-destructive text-[16px]">receipt_long</span>
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Expenses</span>
                                </div>
                                <p className="text-sm font-bold text-foreground">৳{stats.totalExpenses.toLocaleString("en-IN")}</p>
                              </div>
                            </div>

                            {/* Secondary info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
                                <span className="material-symbols-outlined text-muted-foreground text-[16px]">inventory_2</span>
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Inventory</p>
                                  <p className="text-xs font-bold text-foreground">{stats.inventoryItems} items · {stats.totalStock} units</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
                                <span className="material-symbols-outlined text-muted-foreground text-[16px]">people</span>
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Customers</p>
                                  <p className="text-xs font-bold text-foreground">{stats.customerCount}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
                                <span className="material-symbols-outlined text-muted-foreground text-[16px]">pending</span>
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Total Due</p>
                                  <p className="text-xs font-bold text-foreground">৳{stats.totalDue.toLocaleString("en-IN")}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
                                <span className="material-symbols-outlined text-muted-foreground text-[16px]">account_balance</span>
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Capital</p>
                                  <p className="text-xs font-bold text-foreground">৳{stats.totalCapital.toLocaleString("en-IN")}</p>
                                </div>
                              </div>
                            </div>

                            {/* Monthly Trend Chart */}
                            {stats.monthlyData.some(m => m.sales > 0 || m.expenses > 0 || m.profit > 0) && (
                              <div className="bg-card rounded-lg border border-border p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="material-symbols-outlined text-primary text-[16px]">show_chart</span>
                                  <span className="text-xs font-bold text-foreground">Monthly Trends (Last 6 Months)</span>
                                </div>
                                <div className="h-48">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id={`salesGrad-${b.id}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="hsl(217, 84%, 53%)" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="hsl(217, 84%, 53%)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id={`profitGrad-${b.id}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                                          <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id={`expGrad-${b.id}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.2} />
                                          <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={45}
                                        tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: "hsl(var(--card))",
                                          border: "1px solid hsl(var(--border))",
                                          borderRadius: "8px",
                                          fontSize: "11px",
                                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                        }}
                                        labelStyle={{ fontWeight: 700, color: "hsl(var(--foreground))" }}
                                        formatter={(value: number, name: string) => [`৳${value.toLocaleString("en-IN")}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                                      />
                                      <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                                      <Area type="monotone" dataKey="sales" stroke="hsl(217, 84%, 53%)" fill={`url(#salesGrad-${b.id})`} strokeWidth={2} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                                      <Area type="monotone" dataKey="profit" stroke="hsl(160, 84%, 39%)" fill={`url(#profitGrad-${b.id})`} strokeWidth={2} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                                      <Area type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 51%)" fill={`url(#expGrad-${b.id})`} strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {/* No data message */}
                            {stats.monthlyData.every(m => m.sales === 0 && m.expenses === 0) && (
                              <div className="bg-card rounded-lg border border-border p-4 text-center">
                                <span className="material-symbols-outlined text-2xl text-muted-foreground/30 block mb-1">show_chart</span>
                                <p className="text-xs text-muted-foreground">No sales or expenses data yet to show trends.</p>
                              </div>
                            )}

                            {/* Meta info */}
                            <div className="flex items-center gap-4 flex-wrap pt-1 border-t border-border">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                Created {format(new Date(b.created_at), "MMM d, yyyy")}
                              </span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">group</span>
                                {partnerCount} partner{partnerCount !== 1 ? "s" : ""}
                              </span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">currency_exchange</span>
                                Rate: ¥1 = ৳{b.exchange_rate}
                              </span>
                              {isOwner && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">shield</span>
                                  You are the owner
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {pendingRequest && (
                    <div className="mt-3 border border-destructive/30 bg-destructive/5 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-destructive text-base">warning</span>
                        <p className="text-xs font-bold text-destructive">Deletion Requested</p>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {approvedCount}/{totalVotes} approved
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {votes.map((v) => (
                          <span key={v.id} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            v.vote === "approved"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : v.vote === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {v.user_id === user?.id ? "You" : "Partner"}: {v.vote}
                          </span>
                        ))}
                      </div>
                      {/* Show vote buttons if user hasn't voted yet */}
                      {myVote && myVote.vote === "pending" && (
                        <div className="flex items-center gap-2 pt-1">
                          <button onClick={() => handleVote(pendingRequest.id, "approved")}
                            className="flex-1 bg-destructive text-destructive-foreground py-1.5 rounded-lg text-xs font-bold hover:bg-destructive/90">
                            Approve Deletion
                          </button>
                          <button onClick={() => handleVote(pendingRequest.id, "rejected")}
                            className="flex-1 bg-muted text-foreground py-1.5 rounded-lg text-xs font-bold hover:bg-muted/80">
                            Reject
                          </button>
                        </div>
                      )}
                      {/* Owner can cancel */}
                      {isRequester && (
                        <button onClick={() => handleCancelRequest(pendingRequest.id)}
                          className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors">
                          Cancel request
                        </button>
                      )}
                    </div>
                  )}

                  {/* Delete confirmation panel */}
                  {confirmDeleteId === b.id && (
                    <div className="mt-3 border-2 border-destructive/40 bg-destructive/5 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-destructive text-xl mt-0.5">dangerous</span>
                        <div>
                          <p className="font-bold text-sm text-destructive">Delete "{b.name}"?</p>
                          {hasPartners ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              This business has <strong>{partnerCount}</strong> partners. All partners must approve before deletion.
                              A request will be sent to each partner.
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">
                              This will <strong>permanently delete</strong> all data including inventory, sales, expenses, and customers.
                              This action cannot be undone.
                            </p>
                          )}
                        </div>
                      </div>

                      {!hasPartners && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Type "<span className="text-destructive">{b.name.toUpperCase()}</span>" to confirm
                          </label>
                          <input
                            className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-destructive/30 text-foreground uppercase"
                            placeholder={b.name.toUpperCase()}
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {hasPartners ? (
                          <button onClick={() => handleRequestDeletion(b)}
                            className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg text-xs font-bold hover:bg-destructive/90 flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">send</span>
                            Request Partner Approval
                          </button>
                        ) : (
                          <button onClick={() => handleDeleteDirect(b)}
                            disabled={deleteConfirmText !== b.name.toUpperCase()}
                            className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg text-xs font-bold hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">delete_forever</span>
                            Delete Permanently
                          </button>
                        )}
                        <button onClick={() => { setConfirmDeleteId(null); setDeleteConfirmText(""); }}
                          className="px-4 py-2 rounded-lg text-xs font-bold bg-muted hover:bg-muted/80 text-foreground">
                          Cancel
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
    </div>
  );
};

export default Business;
