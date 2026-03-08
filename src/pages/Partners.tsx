import { useState, useEffect } from "react";
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
  const [contributions, setContributions] = useState<any[]>([]);
  const [currency, setCurrency] = useState<"BDT" | "RMB">("BDT");
  const [partnerRole, setPartnerRole] = useState("working");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [capitalAmount, setCapitalAmount] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    const { data: p } = await supabase.from("partners").select("*").eq("business_id", businessId!);
    setPartners(p || []);
    const { data: c } = await supabase.from("capital_contributions").select("*, partners(name)").eq("business_id", businessId!);
    setContributions(c || []);
    const { data: inv } = await supabase.from("partners").select("*").eq("business_id", businessId!).eq("status", "pending");
    setPendingInvites(inv || []);
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
    // Check if already a partner
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

      // Update the found user's profile via secure function
      const { error: rpcError } = await supabase.rpc("add_partner_to_business" as any, {
        _target_user_id: foundUser.user_id,
        _business_id: businessId,
        _role: partnerRole,
      });
      if (rpcError) console.error("Profile update error:", rpcError.message);

      // Send notification to the added user
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

      toast.success(`${foundUser.full_name || foundUser.username} added as partner!`);
      setSearchUsername(""); setFoundUser(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add partner");
    }
  };

  const handleRemovePartner = async (partner: any) => {
    if (!businessId || !user) return;
    const confirmed = window.confirm(`Remove ${partner.name} from the business?`);
    if (!confirmed) return;
    try {
      // Delete partner record
      const { error } = await supabase.from("partners").delete().eq("id", partner.id);
      if (error) { toast.error(error.message); return; }

      // If partner has a linked user, reset their profile's business_id
      if (partner.user_id) {
        try {
          await supabase.rpc("add_partner_to_business" as any, {
            _target_user_id: partner.user_id,
            _business_id: null as any,
            _role: "admin",
          });
        } catch {}

        // Notify removed partner
        try {
          await (supabase.from("notifications") as any).insert({
            user_id: partner.user_id,
            title: "You've been removed from a business",
            message: `You have been removed as a partner.`,
            type: "partner_removed",
            business_id: businessId,
          });
        } catch {}
      }

      toast.success(`${partner.name} removed`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove partner");
    }
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
    await supabase.from("activity_log").insert({
      action: "Added capital contribution", details: { amount: amt, currency },
      business_id: businessId, user_id: user.id,
    });
    toast.success("Capital added!");
    setCapitalAmount(""); setSelectedPartnerId("");
    fetchData();
  };

  const handleGenerateCode = async () => {
    if (!businessId || !user) return;
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const { error } = await supabase.from("partners").insert({
      name: "Pending Partner", role: "working", invitation_code: code,
      status: "pending", business_id: businessId, invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    setGeneratedCode(code);
    toast.success("Invitation code generated!");
    fetchData();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied!");
  };

  // Calculate equity
  const partnerEquity = partners.filter(p => p.status === "accepted").map((p) => {
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
              <span className="material-symbols-outlined text-emerald-500">person_add</span>
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
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
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
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
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
                  {partners.filter(p => p.status === "accepted").map((p) => (
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
                      <button key={c} onClick={() => setCurrency(c)}
                        className={`flex-1 py-2 text-xs font-bold rounded-md ${currency === c ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleAddCapital}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">add_card</span> Inject Capital
              </button>
            </div>
          </section>

          {/* Invite Partner */}
          <section className="bg-card p-4 lg:p-6 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-blue-400">mail</span>
              <h3 className="font-bold text-lg">Invite Partner</h3>
            </div>
            <div className="bg-primary/5 border border-dashed border-primary/30 rounded-xl p-4 mb-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">Generate a code for a new partner to join.</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-card px-3 py-2 rounded-lg border border-border text-sm font-mono flex items-center justify-between">
                  <span className={generatedCode ? "text-foreground font-bold" : "text-muted-foreground italic"}>
                    {generatedCode || "No code generated"}
                  </span>
                  {generatedCode && (
                    <button onClick={copyCode}>
                      <span className="material-symbols-outlined text-sm text-muted-foreground hover:text-foreground">content_copy</span>
                    </button>
                  )}
                </div>
                <button onClick={handleGenerateCode} className="bg-primary px-4 py-2 rounded-lg text-primary-foreground font-bold text-sm">
                  Generate
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Pending Invitations ({pendingInvites.length})</p>
              {pendingInvites.length === 0 ? (
                <p className="text-sm text-muted-foreground italic p-2">No pending invitations</p>
              ) : (
                <div className="space-y-2">
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                      <span className="font-mono font-bold">{inv.invitation_code}</span>
                      <span className="text-xs text-muted-foreground">
                        {inv.expires_at ? `Expires ${format(new Date(inv.expires_at), "MMM d")}` : "No expiry"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Partner Equity */}
          <section className="bg-card p-4 lg:p-6 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-purple-500">pie_chart</span>
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

        {/* Footer Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Partners", value: String(partners.filter(p => p.status === "accepted").length), icon: "group", color: "text-blue-600" },
            { label: "Total Capital", value: `৳${totalCapital.toFixed(0)}`, icon: "payments", color: "text-emerald-600" },
            { label: "Pending Invites", value: String(pendingInvites.length), icon: "pending", color: "text-amber-600" },
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
