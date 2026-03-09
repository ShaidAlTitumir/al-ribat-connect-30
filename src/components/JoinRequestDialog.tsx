import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface JoinRequest {
  id: string;
  user_id: string;
  business_id: string;
  status: string;
  created_at: string;
  user_name?: string;
  business_name?: string;
}

interface JoinRequestDialogProps {
  open: boolean;
  onClose: () => void;
  notificationBusinessId: string | null;
}

const JoinRequestDialog = ({ open, onClose, notificationBusinessId }: JoinRequestDialogProps) => {
  const { user } = useAuth();
  const { businessId } = useBusiness();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const targetBizId = notificationBusinessId || businessId;

  useEffect(() => {
    if (open && targetBizId) fetchRequests();
  }, [open, targetBizId]);

  const fetchRequests = async () => {
    if (!targetBizId) return;
    setLoading(true);
    const { data } = await (supabase.from("join_requests").select("*") as any)
      .eq("business_id", targetBizId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // Fetch user names
      const userIds = data.map((r: any) => r.user_id);
      const { data: profiles } = await (supabase.from("profiles").select("user_id, full_name") as any)
        .in("user_id", userIds);

      const { data: biz } = await (supabase.from("businesses").select("id, name") as any)
        .eq("id", targetBizId)
        .maybeSingle();

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

      setRequests(data.map((r: any) => ({
        ...r,
        user_name: profileMap[r.user_id] || "Unknown",
        business_name: biz?.name || "Business",
      })));
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  const handleApprove = async (req: JoinRequest) => {
    if (!user) return;
    setProcessing(req.id);
    try {
      // Update request status
      await (supabase.from("join_requests") as any)
        .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("id", req.id);

      // Add as business member
      await (supabase.from("business_members") as any).insert({
        user_id: req.user_id, business_id: req.business_id, role: "member",
      });

      // Add as partner (upsert to prevent duplicates)
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await supabase.from("partners").upsert({
        name: req.user_name || "Partner",
        role: "working", invitation_code: code, status: "accepted",
        business_id: req.business_id, user_id: req.user_id, invited_by: user.id,
      }, { onConflict: "business_id,user_id", ignoreDuplicates: true });

      // Update their profile
      await supabase.from("profiles")
        .update({ business_id: req.business_id, role: "member" })
        .eq("user_id", req.user_id);

      // Notify the requester
      await (supabase.from("notifications") as any).insert({
        user_id: req.user_id,
        business_id: req.business_id,
        title: "Join Request Approved",
        message: `Your request to join "${req.business_name}" has been approved! You can now access the business.`,
        type: "join_approved",
      });

      // Mark related join_request notifications as read
      await (supabase.from("notifications") as any)
        .update({ is_read: true })
        .eq("business_id", req.business_id)
        .eq("type", "join_request")
        .eq("is_read", false);

      toast.success(`${req.user_name} has been added to the business!`);
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (req: JoinRequest) => {
    if (!user) return;
    setProcessing(req.id);
    try {
      await (supabase.from("join_requests") as any)
        .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("id", req.id);

      await (supabase.from("notifications") as any).insert({
        user_id: req.user_id,
        business_id: req.business_id,
        title: "Join Request Rejected",
        message: `Your request to join "${req.business_name}" was not approved.`,
        type: "join_rejected",
      });

      // Mark related join_request notifications as read
      await (supabase.from("notifications") as any)
        .update({ is_read: true })
        .eq("business_id", req.business_id)
        .eq("type", "join_request")
        .eq("is_read", false);

      toast.info(`Rejected ${req.user_name}'s request`);
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-border rounded-2xl">
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">group_add</span>
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Join Requests</h2>
              <p className="text-xs text-muted-foreground">Approve or reject pending requests</p>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-muted-foreground/40 block mb-2">check_circle</span>
              <p className="text-sm text-muted-foreground">No pending join requests</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {requests.map((req) => (
                <div key={req.id} className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {req.user_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-foreground">{req.user_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Requested {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processing === req.id}
                      className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-xs font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      disabled={processing === req.id}
                      className="flex-1 bg-muted text-foreground py-2 rounded-lg text-xs font-bold hover:bg-muted/80 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRequestDialog;
