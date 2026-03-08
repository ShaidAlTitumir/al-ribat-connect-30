import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Phone, Mail, MapPin, Pencil, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";
import { format } from "date-fns";

const Partners = () => {
  const { businessId, exchangeRate } = useBusiness();
  const { user } = useAuth();
  const [partners, setPartners] = useState<any[]>([]);
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [currency, setCurrency] = useState<"BDT" | "RMB">("BDT");
  const [partnerRole, setPartnerRole] = useState("working");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [capitalAmount, setCapitalAmount] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", address: "", role: "" });
  const [useManualRate, setUseManualRate] = useState(false);
  const [manualRate, setManualRate] = useState("");
  const [editingContribution, setEditingContribution] = useState<any>(null);
  const [editContribForm, setEditContribForm] = useState({ amount: "", currency: "BDT" as "BDT" | "RMB" });
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveVotes, setLeaveVotes] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!businessId) return;
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    const { data: p } = await supabase.from("partners").select("*").eq("business_id", businessId!);
    let partnersList = p || [];

    if (user && !partnersList.find(pt => pt.user_id === user.id)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { data: newPartner, error } = await supabase.from("partners").insert({
        name: profile?.full_name || "Owner",
        role: "admin",
        invitation_code: code,
        status: "accepted",
        business_id: businessId,
        user_id: user.id,
        invited_by: user.id,
      }).select().maybeSingle();

      if (!error && newPartner) {
        partnersList = [...partnersList, newPartner];
      }
    }

    setPartners(partnersList);
    const { data: c } = await supabase.from("capital_contributions").select("*, partners(name)").eq("business_id", businessId!);
    setContributions(c || []);

    // Fetch pending leave requests
    const { data: lr } = await (supabase
      .from("partner_leave_requests")
      .select("*") as any)
      .eq("business_id", businessId!)
      .eq("status", "pending");
    setLeaveRequests(lr || []);

    // Fetch votes for pending leave requests
    const reqIds = (lr || []).map((r: any) => r.id);
    if (reqIds.length > 0) {
      const { data: votes } = await (supabase
        .from("partner_leave_votes")
        .select("*") as any)
        .in("request_id", reqIds);
      const voteMap: Record<string, any[]> = {};
      (votes || []).forEach((v: any) => {
        if (!voteMap[v.request_id]) voteMap[v.request_id] = [];
        voteMap[v.request_id].push(v);
      });
      setLeaveVotes(voteMap);
    } else {
      setLeaveVotes({});
    }
  };

  const handleSearchUser = async () => {
    if (!searchUsername.trim()) { toast.error("Enter a username"); return; }
    setSearchingUser(true);
    setFoundUser(null);
    const { data, error } = await (supabase
      .from("profiles")
      .select("user_id, full_name, username") as any)
      .eq("username", searchUsername.trim().toLowerCase())
      .maybeSingle();
    setSearchingUser(false);
    if (error || !data) {
      toast.error("No user found with that username");
      return;
    }
    const existing = partners.find(p => p.user_id === (data as any).user_id);
    if (existing) {
      toast.error("This user is already a partner");
      return;
    }
    setFoundUser(data);
  };

  const handleAddByUsername = async () => {
    if (!businessId) { toast.error("No business found. Please log out and log back in."); return; }
    if (!user || !foundUser) { toast.error("Please search for a user first"); return; }
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { error } = await supabase.from("partners").insert({
        name: foundUser.full_name || foundUser.username || "Partner",
        role: partnerRole, invitation_code: code,
        status: "accepted", business_id: businessId,
        user_id: foundUser.user_id, invited_by: user.id,
      });
      if (error) { toast.error(error.message); return; }

      const { error: rpcError } = await supabase.rpc("add_partner_to_business" as any, {
        _target_user_id: foundUser.user_id,
        _business_id: businessId,
        _role: partnerRole,
      });
      if (rpcError) console.error("Profile update error:", rpcError.message);

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      await (supabase.from("notifications") as any).insert({
        user_id: foundUser.user_id,
        title: "You've been added as a partner",
        message: `${myProfile?.full_name || "Someone"} added you as a ${partnerRole} partner.`,
        type: "partner_added",
        business_id: businessId,
      });

      await supabase.from("activity_log").insert({
        action: "Added new partner",
        details: { partner_name: foundUser.full_name || foundUser.username, role: partnerRole },
        business_id: businessId, user_id: user.id,
      });
      toast.success(`${foundUser.full_name || foundUser.username} added as partner!`);
      setSearchUsername(""); setFoundUser(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add partner");
    }
  };

  const handleRemovePartner = async (partner: any) => {
    if (!businessId || !user) return;

    // If only 2 partners (self + target), remove immediately
    const otherPartners = acceptedPartners.filter(p => p.user_id && p.user_id !== user.id && p.id !== partner.id);
    if (otherPartners.length === 0) {
      const confirmed = window.confirm(`Remove ${partner.name} from the business?`);
      if (!confirmed) return;
      try {
        const { error } = await supabase.from("partners").delete().eq("id", partner.id);
        if (error) { toast.error(error.message); return; }
        if (partner.user_id) {
          try {
            await supabase.rpc("add_partner_to_business" as any, {
              _target_user_id: partner.user_id, _business_id: null as any, _role: "admin",
            });
          } catch {}
          try {
            await (supabase.from("notifications") as any).insert({
              user_id: partner.user_id, title: "You've been removed from a business",
              message: `You have been removed as a partner.`, type: "partner_removed", business_id: businessId,
            });
          } catch {}
        }
        await supabase.from("activity_log").insert({
          action: "Removed partner", details: { partner_name: partner.name },
          business_id: businessId, user_id: user.id,
        });
        toast.success(`${partner.name} removed`);
        fetchData();
      } catch (err: any) { toast.error(err.message || "Failed to remove partner"); }
      return;
    }

    // Multiple partners: create removal request needing approval
    const existingRemoval = leaveRequests.find(r => r.partner_id === partner.id && r.type === "removal");
    if (existingRemoval) { toast.error("A removal request is already pending for this partner"); return; }

    const confirmed = window.confirm(`Request to remove ${partner.name}? Other partners will need to approve.`);
    if (!confirmed) return;

    const { data: req, error } = await (supabase
      .from("partner_leave_requests")
      .insert({ business_id: businessId, partner_id: partner.id, requested_by: user.id, type: "removal" }) as any)
      .select().single();
    if (error) { toast.error(error.message); return; }

    // Create votes for all other partners (excluding the one being removed and the requester)
    const voterPartners = acceptedPartners.filter(p => p.user_id && p.user_id !== user.id && p.id !== partner.id);
    if (voterPartners.length > 0) {
      const voteInserts = voterPartners.map(p => ({ request_id: req.id, user_id: p.user_id, vote: "pending" }));
      await (supabase.from("partner_leave_votes") as any).insert(voteInserts);
      const notifInserts = voterPartners.map(p => ({
        user_id: p.user_id, business_id: businessId,
        title: "Partner Removal Request",
        message: `A request to remove ${partner.name} from the business has been submitted. Your approval is required.`,
        type: "removal_request",
      }));
      await (supabase.from("notifications") as any).insert(notifInserts);
    }

    // Auto-approve for requester
    await (supabase.from("partner_leave_votes") as any).insert({
      request_id: req.id, user_id: user.id, vote: "approved", voted_at: new Date().toISOString(),
    });

    await supabase.from("activity_log").insert({
      action: "Requested partner removal", details: { partner_name: partner.name },
      business_id: businessId, user_id: user.id,
    });
    toast.success("Removal request sent to partners for approval");
    fetchData();
  };

  const handleEditPartner = (partner: any) => {
    setEditingPartner(partner);
    setEditForm({
      name: partner.name || "",
      phone: partner.phone || "",
      email: partner.email || "",
      address: partner.address || "",
      role: partner.role || "working",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPartner) return;
    const { error } = await (supabase.from("partners") as any)
      .update({
        name: editForm.name,
        phone: editForm.phone || null,
        email: editForm.email || null,
        address: editForm.address || null,
        role: editForm.role,
      })
      .eq("id", editingPartner.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Partner updated!");
    setEditingPartner(null);
    fetchData();
  };

  const handleAddCapital = async () => {
    if (!businessId || !user || !selectedPartnerId || !capitalAmount) { toast.error("Fill all fields"); return; }
    const amt = parseFloat(capitalAmount);
    if (amt <= 0) { toast.error("Enter a valid amount"); return; }
    const { error } = await supabase.from("capital_contributions").insert({
      partner_id: selectedPartnerId, amount: amt, currency,
      business_id: businessId, user_id: user.id,
    });
    if (error) { toast.error(error.message); return; }
    const partnerName = acceptedPartners.find(p => p.id === selectedPartnerId)?.name || "Unknown";
    const capitalRate = currency === "RMB" ? (useManualRate && parseFloat(manualRate) > 0 ? parseFloat(manualRate) : exchangeRate) : null;
    const bdtEquivalent = currency === "RMB" ? amt * (capitalRate || exchangeRate) : amt;
    await supabase.from("activity_log").insert({
      action: "Added capital contribution", details: { 
        partner_name: partnerName, amount: amt, currency, 
        ...(currency === "RMB" ? { rate: capitalRate, bdt_equivalent: bdtEquivalent } : {})
      },
      business_id: businessId, user_id: user.id,
    });
    toast.success("Capital added!");
    setCapitalAmount(""); setSelectedPartnerId("");
    fetchData();
  };

  const handleEditContribution = (contrib: any) => {
    setEditingContribution(contrib);
    setEditContribForm({ amount: String(contrib.amount), currency: contrib.currency });
  };

  const handleSaveContribution = async () => {
    if (!editingContribution || !businessId || !user) return;
    const amt = parseFloat(editContribForm.amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const { error } = await supabase.from("capital_contributions")
      .update({ amount: amt, currency: editContribForm.currency })
      .eq("id", editingContribution.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("activity_log").insert({
      action: "Updated capital contribution",
      details: { 
        partner_name: editingContribution.partners?.name,
        old_amount: editingContribution.amount, old_currency: editingContribution.currency,
        new_amount: amt, new_currency: editContribForm.currency,
      },
      business_id: businessId, user_id: user.id,
    });
    toast.success("Contribution updated!");
    setEditingContribution(null);
    fetchData();
  };

  const handleDeleteContribution = async (contrib: any) => {
    if (!businessId || !user) return;
    const confirmed = window.confirm(`Delete ${contrib.currency === "RMB" ? "¥" : "৳"}${contrib.amount} contribution?`);
    if (!confirmed) return;
    const { error } = await supabase.from("capital_contributions").delete().eq("id", contrib.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("activity_log").insert({
      action: "Deleted capital contribution",
      details: { partner_name: contrib.partners?.name, amount: contrib.amount, currency: contrib.currency },
      business_id: businessId, user_id: user.id,
    });
    toast.success("Contribution deleted!");
    fetchData();
  };

  // --- Leave Request Logic ---
  const handleRequestLeave = async () => {
    if (!businessId || !user) return;
    const myPartner = acceptedPartners.find(p => p.user_id === user.id);
    if (!myPartner) { toast.error("You are not a partner"); return; }
    if (acceptedPartners.length <= 1) { toast.error("You are the only partner — delete the business instead"); return; }

    // Check if there's already a pending request for this partner
    const existing = leaveRequests.find(r => r.partner_id === myPartner.id);
    if (existing) { toast.error("You already have a pending leave request"); return; }

    const confirmed = window.confirm("Request to leave this business? Other partners will need to approve.");
    if (!confirmed) return;

    const { data: req, error } = await (supabase
      .from("partner_leave_requests")
      .insert({ business_id: businessId, partner_id: myPartner.id, requested_by: user.id }) as any)
      .select()
      .single();
    if (error) { toast.error(error.message); return; }

    // Create vote entries for all OTHER partners
    const otherPartners = acceptedPartners.filter(p => p.user_id && p.user_id !== user.id);
    if (otherPartners.length > 0) {
      const voteInserts = otherPartners.map(p => ({
        request_id: req.id,
        user_id: p.user_id,
        vote: "pending",
      }));
      await (supabase.from("partner_leave_votes") as any).insert(voteInserts);

      // Notify other partners
      const notifInserts = otherPartners.map(p => ({
        user_id: p.user_id,
        business_id: businessId,
        title: "Partner Leave Request",
        message: `${myPartner.name} has requested to leave the business. Your approval is required.`,
        type: "leave_request",
      }));
      await (supabase.from("notifications") as any).insert(notifInserts);
    }

    // Auto-approve for the requester
    await (supabase.from("partner_leave_votes") as any).insert({
      request_id: req.id,
      user_id: user.id,
      vote: "approved",
      voted_at: new Date().toISOString(),
    });

    await supabase.from("activity_log").insert({
      action: "Requested to leave business",
      details: { partner_name: myPartner.name },
      business_id: businessId, user_id: user.id,
    });

    toast.success("Leave request sent to partners for approval");
    fetchData();
  };

  const handleLeaveVote = async (requestId: string, vote: "approved" | "rejected") => {
    if (!user || !businessId) return;

    await (supabase.from("partner_leave_votes") as any)
      .update({ vote, voted_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .eq("user_id", user.id);

    const request = leaveRequests.find(r => r.id === requestId);
    const leavingPartner = request ? acceptedPartners.find(p => p.id === request.partner_id) : null;

    if (vote === "rejected") {
      await (supabase.from("partner_leave_requests") as any)
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (request && request.requested_by !== user.id) {
        await (supabase.from("notifications") as any).insert({
          user_id: request.requested_by,
          business_id: businessId,
          title: "Leave Request Rejected",
          message: `Your request to leave the business was rejected by a partner.`,
          type: "leave_request",
        });
      }
      toast.info("You rejected the leave request");
    } else {
      // Check if all voted approved
      const { data: allVotes } = await (supabase
        .from("partner_leave_votes")
        .select("*") as any)
        .eq("request_id", requestId);

      const allApproved = (allVotes || []).every((v: any) => v.vote === "approved");
      if (allApproved && leavingPartner) {
        // Execute leave: remove partner from business
        await (supabase.from("partner_leave_requests") as any)
          .update({ status: "approved" })
          .eq("id", requestId);

        await supabase.from("partners").delete().eq("id", leavingPartner.id);

        if (leavingPartner.user_id) {
          try {
            await supabase.rpc("add_partner_to_business" as any, {
              _target_user_id: leavingPartner.user_id,
              _business_id: null as any,
              _role: "admin",
            });
          } catch {}

          await (supabase.from("notifications") as any).insert({
            user_id: leavingPartner.user_id,
            business_id: businessId,
            title: "You have left the business",
            message: `All partners approved your request to leave.`,
            type: "leave_request",
          });
        }

        await supabase.from("activity_log").insert({
          action: "Partner left business (approved)",
          details: { partner_name: leavingPartner.name },
          business_id: businessId, user_id: user.id,
        });

        toast.success(`${leavingPartner.name} has been removed from the business`);
      } else {
        toast.success("Vote recorded. Waiting for other partners.");
      }
    }
    fetchData();
  };

  const getMyLeaveRequest = () => {
    if (!user) return null;
    const myPartner = acceptedPartners.find(p => p.user_id === user.id);
    if (!myPartner) return null;
    return leaveRequests.find(r => r.partner_id === myPartner.id);
  };

  const acceptedPartners = partners.filter(p => p.status === "accepted");

  // Calculate equity
  const partnerEquity = acceptedPartners.map((p) => {
    const caps = contributions.filter((c) => c.partner_id === p.id);
    const totalBdt = caps.reduce((sum, c) => sum + (c.currency === "RMB" ? c.amount * exchangeRate : c.amount), 0);
    return { ...p, totalCapital: totalBdt };
  });
  const totalCapital = partnerEquity.reduce((sum, p) => sum + p.totalCapital, 0);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Partners" />
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Partner */}
          <section className="bg-card p-4 lg:p-6 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">person_add</span>
              <h3 className="font-bold text-lg">Add Partner</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Search by Username</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <input className="w-full bg-muted rounded-lg pl-8 pr-4 py-2.5 text-sm border-none text-foreground"
                      placeholder="username" value={searchUsername}
                      onChange={(e) => { setSearchUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setFoundUser(null); }} />
                  </div>
                  <button onClick={handleSearchUser} disabled={searchingUser}
                    className="bg-primary px-4 py-2 rounded-lg text-primary-foreground font-bold text-sm shrink-0">
                    {searchingUser ? "..." : "Search"}
                  </button>
                </div>
              </div>
              {foundUser && (
                <div className="bg-accent/50 border border-border rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                      {foundUser.full_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{foundUser.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">@{foundUser.username}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <select className="w-full bg-card rounded-lg px-4 py-2 text-sm border border-border text-foreground"
                      value={partnerRole} onChange={(e) => setPartnerRole(e.target.value)}>
                      <option value="admin">Admin</option>
                      <option value="working">Working</option>
                      <option value="investor">Investor</option>
                    </select>
                    <button onClick={handleAddByUsername}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base">person_add</span> Add as Partner
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Partners must set a username in Settings first.</p>
            </div>
          </section>

          {/* Add Capital */}
          <section className="bg-card p-4 lg:p-6 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">account_balance</span>
              <h3 className="font-bold text-lg">Add Capital</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Select Partner</label>
                <select className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border-none text-foreground"
                  value={selectedPartnerId} onChange={(e) => setSelectedPartnerId(e.target.value)}>
                  <option value="">Choose partner...</option>
                  {acceptedPartners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Amount</label>
                  <input className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border-none text-foreground"
                    type="number" placeholder="0.00" value={capitalAmount} onChange={(e) => setCapitalAmount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Currency</label>
                  <div className="flex bg-muted rounded-lg p-1">
                    {(["BDT", "RMB"] as const).map((c) => (
                      <button key={c} onClick={() => { setCurrency(c); if (c === "BDT") setUseManualRate(false); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-md ${currency === c ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {currency === "RMB" && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-muted-foreground text-[18px]">tune</span>
                      <span className="text-xs font-semibold text-muted-foreground">Custom RMB rate</span>
                    </div>
                    <button
                      onClick={() => { setUseManualRate(!useManualRate); if (!useManualRate) setManualRate(String(exchangeRate)); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${useManualRate ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${useManualRate ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                  {useManualRate && (
                    <div className="p-3 rounded-lg bg-muted border border-border">
                      <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">1 RMB = ? BDT</label>
                      <input
                        className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary/20"
                        type="number" step="0.01" placeholder={String(exchangeRate)}
                        value={manualRate} onChange={(e) => setManualRate(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Default rate: 1 RMB = {exchangeRate} BDT</p>
                    </div>
                  )}
                  {capitalAmount && (
                    <div className="p-3 rounded-lg bg-accent/50 border border-border">
                      <p className="text-xs text-muted-foreground">BDT Equivalent:</p>
                      <p className="text-sm font-black text-foreground">
                        ৳{((parseFloat(capitalAmount) || 0) * (useManualRate && parseFloat(manualRate) > 0 ? parseFloat(manualRate) : exchangeRate)).toFixed(2)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          @ {useManualRate && parseFloat(manualRate) > 0 ? parseFloat(manualRate) : exchangeRate} BDT/RMB
                        </span>
                      </p>
                    </div>
                  )}
                </>
              )}
              <button onClick={handleAddCapital}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">add_card</span> Add Capital
              </button>
            </div>
          </section>

          {/* Partner List */}
          <section className="bg-card p-4 lg:p-6 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">group</span>
              <h3 className="font-bold text-lg">Partner List ({acceptedPartners.length})</h3>
            </div>
            {acceptedPartners.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl">
                <span className="material-symbols-outlined text-4xl text-muted-foreground/50 mb-2">people</span>
                <h4 className="font-bold mb-1">No partners yet</h4>
                <p className="text-sm text-muted-foreground">Add partners using username search.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {acceptedPartners.map((p) => (
                  <div key={p.id} className="bg-muted rounded-lg overflow-hidden">
                    {editingPartner?.id === p.id ? (
                      <div className="p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input className="bg-card rounded-lg px-3 py-2 text-sm border border-border text-foreground"
                            placeholder="Name" value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                          <select className="bg-card rounded-lg px-3 py-2 text-sm border border-border text-foreground"
                            value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                            <option value="admin">Admin</option>
                            <option value="working">Working</option>
                            <option value="investor">Investor</option>
                          </select>
                        </div>
                        <input className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border text-foreground"
                          placeholder="Phone" value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                        <input className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border text-foreground"
                          placeholder="Email" value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                        <input className="w-full bg-card rounded-lg px-3 py-2 text-sm border border-border text-foreground"
                          placeholder="Address" value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit}
                            className="flex-1 bg-primary text-primary-foreground font-bold py-2 rounded-lg text-sm">
                            Save
                          </button>
                          <button onClick={() => setEditingPartner(null)}
                            className="flex-1 bg-muted border border-border text-foreground font-bold py-2 rounded-lg text-sm">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          className="w-full p-3 flex items-center justify-between"
                          onClick={() => setExpandedPartnerId(expandedPartnerId === p.id ? null : p.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                              {p.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{p.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {expandedPartnerId === p.id ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                        {expandedPartnerId === p.id && (
                          <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                            <div className="space-y-1.5">
                              {p.phone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>{p.phone}</span>
                                </div>
                              )}
                              {p.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>{p.email}</span>
                                </div>
                              )}
                              {p.address && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>{p.address}</span>
                                </div>
                              )}
                              {!p.phone && !p.email && !p.address && (
                                <p className="text-xs text-muted-foreground italic">No contact details added yet.</p>
                              )}
                            </div>
                            <div className="flex gap-1.5 pt-1">
                              <button onClick={() => handleEditPartner(p)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-accent text-foreground text-xs font-bold hover:bg-accent/80 transition-colors">
                                <span className="material-symbols-outlined text-sm">edit</span> Edit
                              </button>
                              {p.user_id !== user?.id && (
                                <button onClick={() => handleRemovePartner(p)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors">
                                  <span className="material-symbols-outlined text-sm">delete</span> Remove
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Leave Business & Pending Leave Requests */}
          <section className="bg-card p-4 lg:p-6 rounded-xl border border-border space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-destructive">exit_to_app</span>
              <h3 className="font-bold text-lg">Leave Business</h3>
            </div>

            {acceptedPartners.length <= 1 ? (
              <p className="text-sm text-muted-foreground">You are the only partner. To leave, delete the business from the Business page.</p>
            ) : (
              <>
                {getMyLeaveRequest() ? (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-amber-500 text-[18px]">hourglass_top</span>
                      <p className="text-sm font-bold text-foreground">Leave request pending</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Waiting for other partners to approve your request to leave.</p>
                    {leaveVotes[getMyLeaveRequest()!.id] && (
                      <div className="mt-2 space-y-1">
                        {leaveVotes[getMyLeaveRequest()!.id].map((v: any) => {
                          const voter = acceptedPartners.find(p => p.user_id === v.user_id);
                          return (
                            <div key={v.id} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{voter?.name || "Partner"}</span>
                              <span className={`font-bold capitalize ${v.vote === "approved" ? "text-green-500" : v.vote === "rejected" ? "text-destructive" : "text-amber-500"}`}>
                                {v.vote}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <button onClick={handleRequestLeave}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 text-destructive font-bold text-sm hover:bg-destructive/20 transition-colors">
                    <LogOut className="w-4 h-4" />
                    Request to Leave Business
                  </button>
                )}
              </>
            )}

            {/* Show other partners' pending leave requests for voting */}
            {leaveRequests.filter(r => r.requested_by !== user?.id).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-bold uppercase text-muted-foreground">Pending Leave Requests</p>
                {leaveRequests
                  .filter(r => r.requested_by !== user?.id)
                  .map(r => {
                    const leavingPartner = acceptedPartners.find(p => p.id === r.partner_id);
                    const myVote = (leaveVotes[r.id] || []).find((v: any) => v.user_id === user?.id);
                    return (
                      <div key={r.id} className="p-3 rounded-lg bg-muted border border-border">
                        <p className="text-sm font-bold mb-1">
                          {leavingPartner?.name || "Partner"} wants to leave
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Requested {format(new Date(r.created_at), "MMM d, yyyy")}
                        </p>
                        {myVote && myVote.vote !== "pending" ? (
                          <p className={`text-xs font-bold capitalize ${myVote.vote === "approved" ? "text-green-500" : "text-destructive"}`}>
                            You {myVote.vote}
                          </p>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => handleLeaveVote(r.id, "approved")}
                              className="flex-1 py-1.5 rounded-lg bg-green-500/10 text-green-600 text-xs font-bold hover:bg-green-500/20 transition-colors">
                              Approve
                            </button>
                            <button onClick={() => handleLeaveVote(r.id, "rejected")}
                              className="flex-1 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition-colors">
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* Partner Equity */}
          <section className="bg-card p-4 lg:p-6 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">pie_chart</span>
              <h3 className="font-bold text-lg">Partner Equity</h3>
            </div>
            {partnerEquity.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl">
                <span className="material-symbols-outlined text-4xl text-muted-foreground/50 mb-2">monitoring</span>
                <h4 className="font-bold mb-1">No equity data</h4>
                <p className="text-sm text-muted-foreground">Register partners and add capital to track equity.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {partnerEquity.map((p) => {
                  const pct = totalCapital > 0 ? (p.totalCapital / totalCapital * 100) : 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-bold text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{p.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">৳{p.totalCapital.toFixed(0)}</p>
                        <p className="text-xs text-primary font-bold">{pct.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border flex justify-between text-sm font-bold">
                  <span>Total Capital</span>
                  <span>৳{totalCapital.toFixed(0)}</span>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Capital Contributions History */}
        <section className="bg-card p-4 lg:p-6 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">history</span>
            <h3 className="font-bold text-lg">Capital Contributions ({contributions.length})</h3>
          </div>
          {contributions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl">
              <span className="material-symbols-outlined text-4xl text-muted-foreground/50 mb-2">account_balance</span>
              <h4 className="font-bold mb-1">No contributions yet</h4>
              <p className="text-sm text-muted-foreground">Add capital to see the history here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {contributions
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((c: any) => (
                <div key={c.id} className="bg-muted rounded-lg p-3">
                  {editingContribution?.id === c.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="bg-card rounded-lg px-3 py-2 text-sm border border-border text-foreground"
                          type="number" placeholder="Amount" value={editContribForm.amount}
                          onChange={(e) => setEditContribForm({ ...editContribForm, amount: e.target.value })}
                        />
                        <div className="flex bg-card rounded-lg p-1 border border-border">
                          {(["BDT", "RMB"] as const).map((cur) => (
                            <button key={cur} onClick={() => setEditContribForm({ ...editContribForm, currency: cur })}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md ${editContribForm.currency === cur ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                              {cur}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveContribution}
                          className="flex-1 bg-primary text-primary-foreground font-bold py-1.5 rounded-lg text-xs">
                          Save
                        </button>
                        <button onClick={() => setEditingContribution(null)}
                          className="flex-1 bg-card border border-border text-foreground font-bold py-1.5 rounded-lg text-xs">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-[16px]">
                            {c.currency === "RMB" ? "currency_yuan" : "payments"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold">
                            {c.currency === "RMB" ? "¥" : "৳"}{c.amount}
                            {c.currency === "RMB" && (
                              <span className="text-xs font-normal text-muted-foreground ml-1">
                                (≈ ৳{(c.amount * exchangeRate).toFixed(0)})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.partners?.name} • {format(new Date(c.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditContribution(c)}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDeleteContribution(c)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer Stats */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Total Partners", value: String(acceptedPartners.length), icon: "group", color: "text-primary" },
            { label: "Total Capital", value: `৳${totalCapital.toFixed(0)}`, icon: "payments", color: "text-primary" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card p-3 lg:p-4 rounded-xl border border-border flex items-center gap-3">
              <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">{stat.label}</p>
                <p className="text-lg font-black">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Partners;
