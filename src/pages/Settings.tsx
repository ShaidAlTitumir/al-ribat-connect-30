import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
      await supabase.from("customer_ledger").delete().eq("business_id", businessId);
      await supabase.from("returns").delete().eq("business_id", businessId);
      await supabase.from("sales").delete().eq("business_id", businessId);
      await supabase.from("purchase_transactions").delete().eq("business_id", businessId);
      await supabase.from("exchanges").delete().eq("business_id", businessId);
      await supabase.from("partner_transfers").delete().eq("business_id", businessId);
      await supabase.from("capital_contributions").delete().eq("business_id", businessId);
      await supabase.from("expenses").delete().eq("business_id", businessId);
      await supabase.from("activity_log").delete().eq("business_id", businessId);
      await supabase.from("customers").delete().eq("business_id", businessId);
      await supabase.from("inventory_items").delete().eq("business_id", businessId);
      toast.success("All business data has been cleaned!");
      setShowCleanConfirm(false);
      setCleanConfirmText("");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(""); }
  };

  const initials = profile.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Settings" />
      <div className="p-3 sm:p-4 lg:p-8 max-w-[800px] w-full mx-auto space-y-4 sm:space-y-6 pb-20">

        {/* Profile */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 sm:p-5 flex items-center gap-2.5 border-b border-border">
            <span className="material-symbols-outlined text-primary text-xl">account_circle</span>
            <h3 className="font-bold text-base sm:text-lg">Profile Information</h3>
          </div>
          <div className="p-4 sm:p-5">
            {/* Avatar + Name row */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-lg sm:text-xl font-bold ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground text-base sm:text-lg truncate">
                  {profile.full_name || "Your Name"}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {profile.username ? `@${profile.username}` : user?.email || ""}
                </p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Full Name</label>
                  <input className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 sm:px-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs sm:text-sm">@</span>
                    <input className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background pl-7 sm:pl-8 pr-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                      placeholder="e.g. john_doe"
                      value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Partners can find & add you by username.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Phone</label>
                  <input className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 sm:px-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2 h-10 sm:h-11 rounded-lg border border-border bg-muted/50 px-3 sm:px-4">
                    <span className="material-symbols-outlined text-muted-foreground text-base">mail</span>
                    <span className="text-sm text-muted-foreground truncate">{user?.email || ""}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button onClick={saveProfile} disabled={saving === "profile"}
                  className="w-full sm:w-auto bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all text-sm">
                  {saving === "profile" ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 sm:p-5 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-xl">lock</span>
              <h3 className="font-bold text-base sm:text-lg">Security</h3>
            </div>
            <button
              onClick={handleForgotPasswordFromSettings}
              disabled={saving === "forgot"}
              className="text-primary text-xs font-semibold hover:underline disabled:opacity-50 active:scale-95 transition-all"
            >
              {saving === "forgot" ? "Sending..." : "Forgot Password?"}
            </button>
          </div>
          <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Current Password</label>
              <input className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 sm:px-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" type="password" placeholder="••••••••"
                value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-muted-foreground">New Password</label>
                <input className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 sm:px-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" type="password" placeholder="••••••••"
                  value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Confirm Password</label>
                <input className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 sm:px-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" type="password" placeholder="••••••••"
                  value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button onClick={savePassword} disabled={saving === "password"}
                className="w-full sm:w-auto bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all text-sm">
                {saving === "password" ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </section>

        {/* Business Settings */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 sm:p-5 flex items-center gap-2.5 border-b border-border">
            <span className="material-symbols-outlined text-primary text-xl">business_center</span>
            <h3 className="font-bold text-base sm:text-lg">Business Settings</h3>
          </div>
          <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Business Name</label>
              <input className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 sm:px-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-muted-foreground">Primary Currency</label>
              <select className="w-full h-10 sm:h-11 rounded-lg border border-border bg-background px-3 sm:px-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                value={business.default_currency} onChange={(e) => setBusiness({ ...business, default_currency: e.target.value })}>
                <option value="BDT">BDT (Taka)</option>
                <option value="RMB">RMB (Yuan)</option>
              </select>
            </div>
            <div className="flex justify-end pt-1">
              <button onClick={saveBusiness} disabled={saving === "business"}
                className="w-full sm:w-auto bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98] transition-all text-sm">
                {saving === "business" ? "Saving..." : "Save Business Settings"}
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-card rounded-xl border border-destructive/40 overflow-hidden">
          <div className="px-4 py-3 sm:p-5 flex items-center gap-2.5 border-b border-destructive/20 bg-destructive/5">
            <span className="material-symbols-outlined text-destructive text-xl">warning</span>
            <h3 className="font-bold text-base sm:text-lg text-destructive">Danger Zone</h3>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm">Clean App Data</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Permanently delete all business data including sales, expenses, inventory, and more.</p>
              </div>
              <button
                onClick={() => setShowCleanConfirm(true)}
                disabled={saving === "clean"}
                className="w-full sm:w-auto shrink-0 bg-destructive text-destructive-foreground font-bold px-5 py-2.5 rounded-lg hover:bg-destructive/90 disabled:opacity-50 active:scale-[0.98] transition-all text-sm"
              >
                {saving === "clean" ? "Cleaning..." : "Clean All Data"}
              </button>
            </div>
          </div>
        </section>

        <Dialog open={showCleanConfirm} onOpenChange={(open) => { setShowCleanConfirm(open); if (!open) setCleanConfirmText(""); }}>
          <DialogContent className="border-destructive/50 max-w-md mx-3">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-destructive text-2xl">delete_forever</span>
                <DialogTitle className="text-destructive text-base">Are you absolutely sure?</DialogTitle>
              </div>
              <DialogDescription className="text-xs sm:text-sm">
                This will permanently delete <strong className="text-foreground">all business data</strong> including sales, expenses, purchases, returns, exchanges, partner transfers, customers, inventory items, and activity logs. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Type <span className="text-destructive font-mono">DELETE</span> to confirm</label>
              <input
                className="w-full h-10 rounded-lg border border-destructive/50 bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-destructive/20 transition-all"
                value={cleanConfirmText}
                onChange={(e) => setCleanConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => { setShowCleanConfirm(false); setCleanConfirmText(""); }}
                className="px-4 py-2 rounded-lg border border-border font-semibold hover:bg-muted text-sm active:scale-[0.98] transition-all">Cancel</button>
              <button
                onClick={cleanAllData}
                disabled={cleanConfirmText !== "DELETE" || saving === "clean"}
                className="bg-destructive text-destructive-foreground font-bold px-4 py-2 rounded-lg hover:bg-destructive/90 disabled:opacity-50 active:scale-[0.98] transition-all text-sm"
              >
                {saving === "clean" ? "Cleaning..." : "Delete Everything"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Builder Credit */}
        <div className="text-center py-4 sm:py-6 border-t border-border mt-2">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Built & maintained by <span className="font-bold text-foreground">Al-Ribat International</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
