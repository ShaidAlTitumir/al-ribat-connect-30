import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LeaveRequestDialogProps {
  open: boolean;
  onClose: () => void;
  notificationBusinessId?: string | null;
}

const LeaveRequestDialog = ({ open, onClose, notificationBusinessId }: LeaveRequestDialogProps) => {
  const { user } = useAuth();
  const { businessId } = useBusiness();
  const [requests, setRequests] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, any[]>>({});
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);

  const targetBusinessId = notificationBusinessId || businessId;

  useEffect(() => {
    if (open && targetBusinessId) fetchData();
  }, [open, targetBusinessId]);

  const fetchData = async () => {
    if (!targetBusinessId) return;
    setLoading(true);

    const [{ data: lr }, { data: p }] = await Promise.all([
      (supabase.from("partner_leave_requests").select("*") as any)
        .eq("business_id", targetBusinessId)
        .eq("status", "pending"),
      supabase.from("partners").select("*").eq("business_id", targetBusinessId),
    ]);

    setRequests(lr || []);
    setPartners(p || []);

    const reqIds = (lr || []).map((r: any) => r.id);
    if (reqIds.length > 0) {
      const { data: v } = await (supabase.from("partner_leave_votes").select("*") as any)
        .in("request_id", reqIds);
      const voteMap: Record<string, any[]> = {};
      (v || []).forEach((vote: any) => {
        if (!voteMap[vote.request_id]) voteMap[vote.request_id] = [];
        voteMap[vote.request_id].push(vote);
      });
      setVotes(voteMap);
    }
    setLoading(false);
  };

  const handleVote = async (requestId: string, vote: "approved" | "rejected") => {
    if (!user || !targetBusinessId) return;
    setVoting(true);

    const request = requests.find(r => r.id === requestId);
    const leavingPartner = request ? partners.find(p => p.id === request.partner_id) : null;
    const isRemoval = request?.type === "removal";
    const label = isRemoval ? "removal" : "leave";

    await (supabase.from("partner_leave_votes") as any)
      .update({ vote, voted_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .eq("user_id", user.id);

    if (vote === "rejected") {
      await (supabase.from("partner_leave_requests") as any)
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (request && request.requested_by !== user.id) {
        await (supabase.from("notifications") as any).insert({
          user_id: request.requested_by,
          business_id: targetBusinessId,
          title: isRemoval ? "Removal Request Rejected" : "Leave Request Rejected",
          message: isRemoval
            ? `Your request to remove ${leavingPartner?.name || "a partner"} was rejected.`
            : `Your request to leave the business was rejected by a partner.`,
          type: isRemoval ? "removal_request" : "leave_request",
        });
      }
      toast.info(`You rejected the ${label} request`);
    } else {
      const { data: allVotes } = await (supabase.from("partner_leave_votes").select("*") as any)
        .eq("request_id", requestId);

      const allApproved = (allVotes || []).every((v: any) => v.vote === "approved");

      if (allApproved && leavingPartner) {
        await (supabase.from("partner_leave_requests") as any)
          .update({ status: "approved" })
          .eq("id", requestId);

        await supabase.from("capital_contributions").delete().eq("partner_id", leavingPartner.id);
        await supabase.from("partners").delete().eq("id", leavingPartner.id);

        const settlementInfo = request?.settlement_amount > 0
          ? ` Settlement: ${request.settlement_currency === "RMB" ? "¥" : "৳"}${request.settlement_amount}`
          : "";

        if (leavingPartner.user_id) {
          try {
            await supabase.rpc("add_partner_to_business" as any, {
              _target_user_id: leavingPartner.user_id,
              _business_id: null as any,
              _role: "admin",
            });
          } catch (e) { console.error("RPC error:", e); }

          await (supabase.from("notifications") as any).insert({
            user_id: leavingPartner.user_id,
            business_id: targetBusinessId,
            title: isRemoval ? "You have been removed from the business" : "You have left the business",
            message: (isRemoval
              ? `All partners approved your removal.`
              : `All partners approved your request to leave.`) + settlementInfo,
            type: isRemoval ? "removal_request" : "leave_request",
          });
        }

        await supabase.from("activity_log").insert({
          action: isRemoval ? "Partner removed (approved)" : "Partner left business (approved)",
          details: {
            partner_name: leavingPartner.name,
            settlement_amount: request?.settlement_amount || 0,
            settlement_currency: request?.settlement_currency || "BDT",
          },
          business_id: targetBusinessId,
          user_id: user.id,
        });

        toast.success(`${leavingPartner.name} has been removed from the business`);
      } else {
        toast.success("Vote recorded. Waiting for other partners.");
      }
    }

    setVoting(false);
    fetchData();
  };

  const getPartnerName = (partnerId: string) =>
    partners.find(p => p.id === partnerId)?.name || "Unknown";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Partner Leave/Removal Requests</DialogTitle>
          <DialogDescription>Review and vote on pending requests</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center">
            <span className="material-symbols-outlined text-3xl text-muted-foreground/40 block mb-1">check_circle</span>
            <p className="text-sm text-muted-foreground">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {requests.map((r) => {
              const isRemoval = r.type === "removal";
              const myVote = (votes[r.id] || []).find((v: any) => v.user_id === user?.id);
              const allVotes = votes[r.id] || [];
              const approvedCount = allVotes.filter((v: any) => v.vote === "approved").length;
              const totalVoters = allVotes.length;

              return (
                <div key={r.id} className="border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-lg mt-0.5">
                      {isRemoval ? "person_remove" : "logout"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {isRemoval ? "Removal Request" : "Leave Request"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isRemoval
                          ? `Request to remove ${getPartnerName(r.partner_id)}`
                          : `${getPartnerName(r.partner_id)} wants to leave`}
                      </p>
                    </div>
                  </div>

                  {r.settlement_amount > 0 && (
                    <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Settlement:</span>{" "}
                      {r.settlement_currency === "RMB" ? "¥" : "৳"}{r.settlement_amount}
                      {r.settlement_notes && <span className="block mt-0.5">{r.settlement_notes}</span>}
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground">
                    {format(new Date(r.created_at), "MMM d, yyyy h:mm a")} · {approvedCount}/{totalVoters} approved
                  </div>

                  {myVote && myVote.vote !== "pending" ? (
                    <div className={`text-xs font-medium px-3 py-1.5 rounded-lg text-center ${
                      myVote.vote === "approved"
                        ? "bg-green-500/10 text-green-600"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      You {myVote.vote === "approved" ? "approved" : "rejected"} this request
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={voting}
                        onClick={() => handleVote(r.id, "approved")}
                        className="flex-1 bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={voting}
                        onClick={() => handleVote(r.id, "rejected")}
                        className="flex-1 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRequestDialog;
