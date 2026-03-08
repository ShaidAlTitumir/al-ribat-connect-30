import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";

const Profile = () => {
  const { user } = useAuth();
  const { userRole } = useBusiness();
  const [profile, setProfile] = useState({ full_name: "", phone: "", username: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
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
        } else throw error;
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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: passwords.currentPassword });
      if (signInError) { toast.error("Current password is incorrect"); setSaving(""); return; }
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;
      toast.success("Password updated!");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(""); }
  };

  const handleForgotPassword = async () => {
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

  const initials = profile.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Profile" />
      <div className="p-3 sm:p-4 lg:p-8 max-w-[800px] w-full mx-auto space-y-4 sm:space-y-6 pb-20">

        {/* Profile Info */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 sm:p-5 flex items-center gap-2.5 border-b border-border">
            <span className="material-symbols-outlined text-primary text-xl">account_circle</span>
            <h3 className="font-bold text-base sm:text-lg">Profile Information</h3>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-lg sm:text-xl font-bold ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground text-base sm:text-lg truncate">{profile.full_name || "Your Name"}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{profile.username ? `@${profile.username}` : user?.email || ""}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-primary/10 text-primary">{userRole || "member"}</span>
                </div>
              </div>
            </div>

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
            <button onClick={handleForgotPassword} disabled={saving === "forgot"}
              className="text-primary text-xs font-semibold hover:underline disabled:opacity-50 active:scale-95 transition-all">
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
      </div>
    </div>
  );
};

export default Profile;
