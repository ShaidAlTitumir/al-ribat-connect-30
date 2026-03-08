import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Phone, Mail, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";

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
    const confirmed = window.confirm(`Remove ${partner.name} from the business?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("partners").delete().eq("id", partner.id);
      if (error) { toast.error(error.message); return; }

      if (partner.user_id) {
        try {
          await supabase.rpc("add_partner_to_business" as any, {
            _target_user_id: partner.user_id,
            _business_id: null as any,
            _role: "admin",
          });
        } catch {}
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

      await supabase.from("activity_log").insert({
        action: "Removed partner",
        details: { partner_name: partner.name },
        business_id: businessId, user_id: user.id,
      });
      toast.success(`${partner.name} removed`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove partner");
    }
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
    await supabase.from("activity_log").insert({
      action: "Added capital contribution", details: { amount: amt, currency },
      business_id: businessId, user_id: user.id,
    });
    toast.success("Capital added!");
    setCapitalAmount(""); setSelectedPartnerId("");
    fetchData();
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
