import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="pt-10 pb-6 px-8 flex flex-col items-center text-center">
        <div className="mb-6 flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl">
          <span className="material-symbols-outlined text-primary text-4xl">domain</span>
        </div>
        <h2 className="text-foreground text-3xl font-black tracking-tight mb-2">Welcome Back</h2>
        <p className="text-muted-foreground text-sm">Al-Ribat Manager: Access your dashboard</p>
      </div>

      {/* Form */}
      <div className="px-8 pb-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-foreground text-sm font-semibold">Email Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">mail</span>
              <Input
                name="email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={handleChange}
                className="pl-11 py-3 h-12 bg-muted border-border focus-visible:ring-primary"
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-foreground text-sm font-semibold">Password</label>
              <Link to="/forgot-password" className="text-primary text-xs font-semibold hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">lock</span>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="pl-11 py-3 h-12 bg-muted border-border focus-visible:ring-primary"
              />
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <Button
            type="submit"
            className="w-full py-3 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
            <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
          </Button>
        </form>

        <p className="mt-8 text-center text-muted-foreground text-sm">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-bold hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
