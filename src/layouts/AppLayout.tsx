import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [pageKey, setPageKey] = useState(location.pathname);

  // Close sidebar on route change (mobile) & trigger page animation
  useEffect(() => {
    setSidebarOpen(false);
    setPageKey(location.pathname);
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

      <main className="flex-1 lg:ml-64 flex flex-col overflow-y-auto min-w-0 scroll-smooth">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 lg:hidden flex items-center gap-3 h-14 px-4 bg-card/95 backdrop-blur-md border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-all duration-200 active:scale-95"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-base font-bold tracking-tight text-foreground">Al-Ribat Manager</h1>
        </div>
        <div key={pageKey} className="animate-page-enter flex-1 flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
