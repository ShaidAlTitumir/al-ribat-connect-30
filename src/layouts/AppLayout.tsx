import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { useBusiness } from "@/contexts/BusinessContext";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const { businessName } = useBusiness();

  // Close sidebar on route change (mobile) & smooth fade transition
  useEffect(() => {
    setSidebarOpen(false);

    // Scroll to top smoothly on page change
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0 });
    }

    // Trigger a quick opacity fade
    setIsTransitioning(true);
    const timeout = setTimeout(() => setIsTransitioning(false), 20);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main ref={mainRef} className="flex-1 lg:ml-64 flex flex-col overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 lg:hidden flex items-center justify-between h-14 px-4 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-all duration-200 active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-foreground leading-tight">Al-Ribat Manager</h1>
              {businessName && (
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{businessName}</p>
              )}
            </div>
          </div>
        </div>
        <div
          className="flex-1 flex flex-col transition-opacity duration-300 ease-out"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
