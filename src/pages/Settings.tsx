import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";

const Settings = () => {
  const { user } = useAuth();
  const { businessId } = useBusiness();
  const [profile, setProfile] = useState({ full_name: "", phone: "", username: "" });
  const [business, setBusiness] = useState({ name: "", default_currency: "BDT" });
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone, username").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setProfile({
          full_name: data.full_name || "",
          phone: data.phone || "",
          username: (data as any).username || "",
        });
      });
  }, [user]);

  useEffect(() => {
    if (!businessId) return;
    supabase.from("businesses").select("name, default_currency").eq("id", businessId).maybeSingle()
      .then(({ data }) => { if (data) setBusiness({ name: data.name || "", default_currency: data.default_currency || "BDT" }); });
  }, [businessId]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving("profile");
    try {
      const username = profile.username.trim().toLowerCase();
      if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
        toast.error("Username must be 3-20 characters (letters, numbers, underscores only)");
        setSaving("");
        return;
      }
      const updateData: any = { full_name: profile.full_name, phone: profile.phone };
      if (username) updateData.username = username;
      else updateData.username = null;

      const { error } = await supabase.from("profiles").update(updateData).eq("user_id", user.id);
      if (error) {
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          toast.error("This username is already taken");
        } else {
          throw error;
        }
        setSaving("");
        return;
      }
      toast.success("Profile updated!");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(""); }
  };

  const savePassword = async () => {
    if (passwords.newPassword.length < 6) { toast.error("Min 6 characters"); return; }
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error("Passwords don't match"); return; }
    setSaving("password");
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;
      toast.success("Password updated!");
      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(""); }
  };

  const saveBusiness = async () => {
    if (!businessId) return;
    setSaving("business");
    try {
      await supabase.from("businesses").update({ name: business.name, default_currency: business.default_currency }).eq("id", businessId);
      toast.success("Business settings saved!");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(""); }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Settings" />
      <div className="p-4 lg:p-8 max-w-[800px] w-full mx-auto space-y-6">
        {/* Profile */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 lg:p-6 flex items-center gap-3 border-b border-border">
            <span className="material-symbols-outlined text-primary">account_circle</span>
            <h3 className="font-bold text-lg">Profile Information</h3>
          </div>
          <div className="p-4 lg:p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-20 h-20 shrink-0 mx-auto md:mx-0 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold border-4 border-muted">
                {profile.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-muted-foreground">Full Name</label>
                    <input className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary/20"
                      value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-muted-foreground">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <input className="w-full h-11 rounded-lg border border-border bg-card pl-8 pr-4 text-foreground focus:ring-2 focus:ring-primary/20"
                        placeholder="e.g. john_doe"
                        value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Partners can add you using this username.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-muted-foreground">Phone</label>
                    <input className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary/20"
                      value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-muted-foreground">Email</label>
                    <input className="w-full h-11 rounded-lg border border-border bg-muted px-4 text-muted-foreground" readOnly value={user?.email || ""} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={saveProfile} disabled={saving === "profile"}
                    className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50">
                    {saving === "profile" ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-card rounded-xl border border-border">
          <div className="p-4 lg:p-6 flex items-center gap-3 border-b border-border">
            <span className="material-symbols-outlined text-primary">lock</span>
            <h3 className="font-bold text-lg">Security</h3>
          </div>
          <div className="p-4 lg:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-muted-foreground">New Password</label>
                <input className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground" type="password" placeholder="••••••••"
                  value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-muted-foreground">Confirm Password</label>
                <input className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground" type="password" placeholder="••••••••"
                  value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={savePassword} disabled={saving === "password"}
                className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {saving === "password" ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </section>

        {/* Business Settings */}
        <section className="bg-card rounded-xl border border-border">
          <div className="p-4 lg:p-6 flex items-center gap-3 border-b border-border">
            <span className="material-symbols-outlined text-primary">business_center</span>
            <h3 className="font-bold text-lg">Business Settings</h3>
          </div>
          <div className="p-4 lg:p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Business Name</label>
              <input className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground"
                value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Primary Currency</label>
              <select className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground"
                value={business.default_currency} onChange={(e) => setBusiness({ ...business, default_currency: e.target.value })}>
                <option value="BDT">BDT (Taka)</option>
                <option value="RMB">RMB (Yuan)</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button onClick={saveBusiness} disabled={saving === "business"}
                className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {saving === "business" ? "Saving..." : "Save Business Settings"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
