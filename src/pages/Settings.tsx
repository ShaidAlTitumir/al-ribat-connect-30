import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";

const Settings = () => {
  const { user } = useAuth();
  const { businessId } = useBusiness();
  const [profile, setProfile] = useState({ full_name: "", phone: "", username: "" });
  const [business, setBusiness] = useState({ name: "", default_currency: "BDT" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState("");
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [cleanConfirmText, setCleanConfirmText] = useState("");

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
    if (!user || !user.email) { toast.error("User not found"); return; }
    if (!passwords.currentPassword) { toast.error("Enter your current password"); return; }
    if (passwords.newPassword.length < 6) { toast.error("Min 6 characters"); return; }
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error("Passwords don't match"); return; }
    setSaving("password");
    try {
      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.currentPassword,
      });
      if (signInError) { toast.error("Current password is incorrect"); setSaving(""); return; }
      
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;
      toast.success("Password updated!");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(""); }
  };

  const handleForgotPasswordFromSettings = async () => {
    if (!user?.email) return;
    setSaving("forgot");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email!");
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

  const cleanAllData = async () => {
    if (!businessId || cleanConfirmText !== "DELETE") return;
    setSaving("clean");
    try {
      const tables = [
        "customer_ledger", "returns", "sales", "purchase_transactions",
        "exchanges", "partner_transfers", "capital_contributions",
        "expenses", "activity_log", "customers", "inventory_items"
      ];
      for (const table of tables) {
        await supabase.from(table).delete().eq("business_id", businessId);
      }
      toast.success("All business data has been cleaned!");
      setShowCleanConfirm(false);
      setCleanConfirmText("");
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

        <section className="bg-card rounded-xl border border-border">
          <div className="p-4 lg:p-6 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">lock</span>
              <h3 className="font-bold text-lg">Security</h3>
            </div>
            <button
              onClick={handleForgotPasswordFromSettings}
              disabled={saving === "forgot"}
              className="text-primary text-xs font-semibold hover:underline disabled:opacity-50"
            >
              {saving === "forgot" ? "Sending..." : "Forgot Password?"}
            </button>
          </div>
          <div className="p-4 lg:p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Current Password</label>
              <input className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary/20" type="password" placeholder="••••••••"
                value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-muted-foreground">New Password</label>
                <input className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary/20" type="password" placeholder="••••••••"
                  value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-muted-foreground">Confirm Password</label>
                <input className="w-full h-11 rounded-lg border border-border bg-card px-4 text-foreground focus:ring-2 focus:ring-primary/20" type="password" placeholder="••••••••"
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

        {/* Danger Zone */}
        <section className="bg-card rounded-xl border border-destructive/50 overflow-hidden">
          <div className="p-4 lg:p-6 flex items-center gap-3 border-b border-destructive/30 bg-destructive/5">
            <span className="material-symbols-outlined text-destructive">warning</span>
            <h3 className="font-bold text-lg text-destructive">Danger Zone</h3>
          </div>
          <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Clean App Data</p>
                <p className="text-sm text-muted-foreground">Permanently delete all sales, expenses, purchases, returns, exchanges, transfers, customers, inventory, and activity logs for this business.</p>
              </div>
              <button
                onClick={() => setShowCleanConfirm(true)}
                disabled={saving === "clean"}
                className="shrink-0 ml-4 bg-destructive text-destructive-foreground font-bold px-5 py-2.5 rounded-lg hover:bg-destructive/90 disabled:opacity-50"
              >
                {saving === "clean" ? "Cleaning..." : "Clean All Data"}
              </button>
            </div>
          </div>
        </section>

        {showCleanConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-card border border-destructive/50 rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-destructive text-3xl">delete_forever</span>
                <h3 className="font-bold text-lg text-destructive">Are you absolutely sure?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                This will permanently delete <strong>all business data</strong> including sales, expenses, purchases, returns, exchanges, partner transfers, customers, inventory items, and activity logs. This action cannot be undone.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">Type <span className="text-destructive font-mono">DELETE</span> to confirm</label>
                <input
                  className="w-full h-11 rounded-lg border border-destructive/50 bg-card px-4 text-foreground focus:ring-2 focus:ring-destructive/20"
                  value={cleanConfirmText}
                  onChange={(e) => setCleanConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowCleanConfirm(false); setCleanConfirmText(""); }}
                  className="px-5 py-2.5 rounded-lg border border-border font-semibold hover:bg-muted">Cancel</button>
                <button
                  onClick={cleanAllData}
                  disabled={cleanConfirmText !== "DELETE" || saving === "clean"}
                  className="bg-destructive text-destructive-foreground font-bold px-5 py-2.5 rounded-lg hover:bg-destructive/90 disabled:opacity-50"
                >
                  {saving === "clean" ? "Cleaning..." : "Delete Everything"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Builder Credit */}
        <div className="text-center py-6 border-t border-border mt-4">
          <p className="text-xs text-muted-foreground">
            Built & maintained by <span className="font-bold text-foreground">Al-Ribat International</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
