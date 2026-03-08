import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { z } from "zod";

const codeSchema = z.object({
  code: z.string().trim().min(1, "Invitation code is required").max(50),
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
      // Look up the invitation code
      const { data: partner, error: lookupError } = await supabase
        .from("partners")
        .select("*")
        .eq("invitation_code", code.trim())
        .eq("status", "pending")
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (!partner) {
        setError("Invalid or already used invitation code");
        setLoading(false);
        return;
      }

      // Claim the partner record
      const { error: updateError } = await supabase
        .from("partners")
        .update({ user_id: user.id, status: "accepted" })
        .eq("id", partner.id);

      if (updateError) throw updateError;

      toast.success(`Welcome to the business, ${partner.name}!`);
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to join business");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <KeyRound className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-1 text-center">Join Your Business</h2>
      <p className="text-sm text-muted-foreground mb-6 text-center">
        Enter the invitation code shared by your business partner
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="code">Invitation Code</Label>
          <Input
            id="code"
            placeholder="Enter your invitation code"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); }}
            className="mt-1.5 text-center tracking-widest font-mono text-lg"
          />
          {error && <p className="text-xs text-destructive mt-1 text-center">{error}</p>}
        </div>

        <Button type="submit" className="w-full gradient-gold text-accent-foreground font-semibold" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Join Business
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Don't have an invitation code? Ask your business partner to share one.
      </p>
    </div>
  );
};

export default JoinBusiness;
