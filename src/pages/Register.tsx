import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  username: z.string().trim().toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(6, "Phone must be at least 6 characters").max(20),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse(form);
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
      const { error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: form.fullName.trim(),
            phone: form.phone.trim(),
          },
        },
      });
      if (error) throw error;
      toast.success("Account created! Please check your email to verify, then join your business.");
      navigate("/join-business");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="px-8 pt-8 pb-6 text-center">
        <div className="flex justify-center items-center gap-2 mb-6">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <span className="material-symbols-outlined text-2xl">account_balance</span>
          </div>
          <h2 className="text-foreground text-xl font-bold tracking-tight">Al-Ribat Manager</h2>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Create Account</h1>
        <p className="text-muted-foreground text-sm">Join us to start managing your workspace</p>
      </div>

      {/* Form */}
      <div className="px-8 pb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">person</span>
              <Input
                name="fullName"
                placeholder="John Doe"
                value={form.fullName}
                onChange={handleChange}
                className="pl-10 py-2.5 h-11 bg-card border-border focus-visible:ring-primary"
              />
            </div>
            {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">mail</span>
              <Input
                name="email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={handleChange}
                className="pl-10 py-2.5 h-11 bg-card border-border focus-visible:ring-primary"
              />
            </div>
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">call</span>
              <Input
                name="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={handleChange}
                className="pl-10 py-2.5 h-11 bg-card border-border focus-visible:ring-primary"
              />
            </div>
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">lock</span>
                <Input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="pl-10 py-2.5 h-11 bg-card border-border focus-visible:ring-primary"
                />
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Confirm</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xl">check_circle</span>
                <Input
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 py-2.5 h-11 bg-card border-border focus-visible:ring-primary"
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full py-3 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover:shadow-lg"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign Up
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
