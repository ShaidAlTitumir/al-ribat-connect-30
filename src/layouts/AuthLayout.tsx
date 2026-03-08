import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card rounded-xl shadow-xl overflow-hidden border border-border">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-muted-foreground text-xs">
          © 2024 Al-Ribat Manager. All rights reserved.
        </p>
      </div>

      {/* Background blurs */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]" />
      </div>
    </div>
  );
};

export default AuthLayout;
