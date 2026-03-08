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

const Business = () => {
  const { user } = useAuth();
  const { businessId, switchBusiness } = useBusiness();
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    // Fetch businesses where user is owner, current business, or member
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

    setBusinesses((data as BusinessData[]) || []);
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

      // Add self as member
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
                        <div className="flex items-center gap-2">
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
                      {!isActive && (
                        <button onClick={() => handleSelect(b.id)}
                          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90">
                          Switch
                        </button>
                      )}
                    </div>
                  </div>
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
