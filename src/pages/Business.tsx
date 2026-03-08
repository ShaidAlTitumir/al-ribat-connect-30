import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
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
    if (deleteConfirmText !== b.name) {
      toast.error("Please type the business name to confirm");
      return;
    }
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
      await (supabase.from("business_deletion_requests") as any)
        .update({ status: "rejected" })
        .eq("id", requestId);
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
          // Delete the business
          await supabase.from("businesses").delete().eq("id", req.business_id);
          await (supabase.from("business_deletion_requests") as any)
            .update({ status: "completed" })
            .eq("id", requestId);

          if (req.business_id === businessId && user) {
            await supabase.from("profiles").update({ business_id: null }).eq("user_id", user.id);
            switchBusiness("");
          }
          toast.success("All partners approved — business deleted");
        }
      } else {
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
                <label className="text-xs font-bold uppercase text-muted-foreground">Business Type</label>
                <input className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border-none text-foreground"
                  placeholder="e.g. Import/Export, Retail" value={formType}
                  onChange={(e) => setFormType(e.target.value)} />
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
                        {b.business_type && (
                          <p className="text-xs text-muted-foreground mt-0.5">{b.business_type}</p>
                        )}
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

                  {/* Pending deletion request banner (for all members) */}
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
                            Type "{b.name}" to confirm
                          </label>
                          <input
                            className="w-full bg-background rounded-lg px-3 py-2 text-sm border border-destructive/30 text-foreground"
                            placeholder={b.name}
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
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
                            disabled={deleteConfirmText !== b.name}
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
