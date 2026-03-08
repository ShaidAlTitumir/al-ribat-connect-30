import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import ExchangeRateHeader from "@/components/ExchangeRateHeader";

const Settings = () => {
  const { user } = useAuth();
  const { businessId, userRole } = useBusiness();
  const navigate = useNavigate();
  const [business, setBusiness] = useState({ name: "", default_currency: "BDT" });
  const [saving, setSaving] = useState("");
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [cleanConfirmText, setCleanConfirmText] = useState("");
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountText, setDeleteAccountText] = useState("");

  useEffect(() => {
    if (!businessId) return;
    supabase.from("businesses").select("name, default_currency").eq("id", businessId).maybeSingle()
      .then(({ data }) => { if (data) setBusiness({ name: data.name || "", default_currency: data.default_currency || "BDT" }); });
  }, [businessId]);

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
      await supabase.from("partners").delete().eq("business_id", businessId);
      await supabase.from("notifications").delete().eq("business_id", businessId);
      const { data: delReqs } = await supabase.from("business_deletion_requests").select("id").eq("business_id", businessId);
      if (delReqs && delReqs.length > 0) {
        for (const dr of delReqs) {
          await supabase.from("business_deletion_votes").delete().eq("request_id", dr.id);
        }
      }
      await supabase.from("business_deletion_requests").delete().eq("business_id", businessId);
      toast.success("All business data has been cleaned!");
      setShowCleanConfirm(false);
      setCleanConfirmText("");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(""); }
  };

  const deleteAccount = async () => {
    if (deleteAccountText !== "DELETE MY ACCOUNT") return;
    setSaving("delete-account");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Not authenticated"); return; }

      const res = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw new Error(res.error.message || "Failed to delete account");
      
      const result = res.data as any;
      if (result?.error) throw new Error(result.error);

      await supabase.auth.signOut();
      toast.success("Your account has been permanently deleted");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <ExchangeRateHeader title="Settings" />
      <div className="p-3 sm:p-4 lg:p-8 max-w-[800px] w-full mx-auto space-y-4 sm:space-y-6 pb-20">

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

        {/* Delete Account */}
        <section className="bg-card rounded-xl border border-destructive/40 overflow-hidden">
          <div className="px-4 py-3 sm:p-5 flex items-center gap-2.5 border-b border-destructive/20 bg-destructive/5">
            <span className="material-symbols-outlined text-destructive text-xl">person_remove</span>
            <h3 className="font-bold text-base sm:text-lg text-destructive">Delete Account</h3>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm">Permanently delete your account</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">This will delete your account, profile, and all businesses you own (if no other partners). This cannot be undone.</p>
              </div>
              <button
                onClick={() => setShowDeleteAccount(true)}
                disabled={saving === "delete-account"}
                className="w-full sm:w-auto shrink-0 bg-destructive text-destructive-foreground font-bold px-5 py-2.5 rounded-lg hover:bg-destructive/90 disabled:opacity-50 active:scale-[0.98] transition-all text-sm"
              >
                {saving === "delete-account" ? "Deleting..." : "Delete My Account"}
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
