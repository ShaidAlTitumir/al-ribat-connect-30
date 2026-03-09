import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const codeSchema = z.object({
  code: z.string().trim().min(1, "Join code is required").max(10),
});

const JoinBusiness = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = codeSchema.safeParse({ code });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (!user) {
      toast.error("You must be logged in to join a business");
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)(
        "create_join_request",
        { _join_code: code.trim().toUpperCase() }
      );

      if (rpcError) throw rpcError;

      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      toast.success(`Join request sent to "${data.business_name}". Waiting for admin approval.`);
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to send join request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Brand Header */}
      <div className="flex flex-col items-center pt-8 pb-4 px-8">
        <div className="bg-primary/10 p-3 rounded-xl mb-3">
          <span className="material-symbols-outlined text-primary text-3xl">deployed_code</span>
        </div>
        <h1 className="text-foreground text-xl font-bold tracking-tight">Al-Ribat Manager</h1>
      </div>

      {/* Hero illustration */}
      <div className="relative h-48 w-full bg-muted">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        <div className="flex items-center justify-center h-full">
          <span className="material-symbols-outlined text-primary text-6xl opacity-50">handshake</span>
        </div>
      </div>

      {/* Form */}
      <div className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-foreground text-2xl font-bold leading-tight mb-2">Join a Business</h2>
          <p className="text-muted-foreground text-base">Enter the 6-digit code shared by the business admin.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-foreground text-sm font-semibold">Join Code</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-muted-foreground text-sm">vpn_key</span>
              </div>
              <Input
                placeholder="e.g., NBW62J"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)); setError(""); }}
                className="pl-10 py-4 h-14 bg-muted border-border focus-visible:ring-primary text-base uppercase tracking-widest font-mono"
                maxLength={6}
              />
            </div>
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
          </div>

          <Button
            type="submit"
            className="w-full py-4 h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
            disabled={loading || code.length !== 6}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Join Business
            <span className="material-symbols-outlined text-lg ml-1">arrow_forward</span>
          </Button>
        </form>

        <div className="mt-8 flex flex-col gap-4 text-center">
          <p className="text-muted-foreground text-sm">
            Don't have a code?{" "}
            <a className="text-primary hover:underline font-medium cursor-pointer">
              Request from the business admin.
            </a>
          </p>
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinBusiness;
