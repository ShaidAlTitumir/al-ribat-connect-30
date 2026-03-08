import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent! Check your email.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
          <span className="material-symbols-outlined text-primary text-4xl">mark_email_read</span>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Check Your Email</h2>
        <p className="text-sm text-muted-foreground mb-6">
          We sent a password reset link to <strong>{email}</strong>
        </p>
        <Link to="/login">
          <Button variant="outline" className="w-full h-12">
            <span className="material-symbols-outlined text-sm mr-2">arrow_back</span>
            Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="pt-10 pb-6 px-8 flex flex-col items-center text-center">
        <div className="mb-6 flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl">
          <span className="material-symbols-outlined text-primary text-4xl">lock_reset</span>
        </div>
        <h2 className="text-foreground text-2xl font-bold tracking-tight mb-2">Forgot Password</h2>
        <p className="text-muted-foreground text-sm">Enter your email and we'll send you a reset link</p>
      </div>

      <div className="px-8 pb-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-foreground text-sm font-semibold">Email Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">mail</span>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="pl-11 py-3 h-12 bg-muted border-border focus-visible:ring-primary"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <Button
            type="submit"
            className="w-full py-3 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </form>

        <p className="mt-8 text-center text-muted-foreground text-sm">
          <Link to="/login" className="text-primary font-semibold hover:underline">
            <span className="material-symbols-outlined text-sm align-middle mr-1">arrow_back</span>
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
