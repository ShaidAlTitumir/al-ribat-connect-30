import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-gold shadow-lg">
            <span className="text-base font-extrabold text-accent-foreground">AR</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Al-Ribat Manager</h1>
            <p className="text-xs text-muted-foreground">Partnership Business</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
