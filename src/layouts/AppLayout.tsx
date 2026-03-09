import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import appLogo from "@/assets/logo.png";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { useBusiness } from "@/contexts/BusinessContext";
import NotificationBell from "@/components/NotificationBell";

interface MobileHeaderContextType {
  setPageHeader: (node: ReactNode) => void;
}
const MobileHeaderContext = createContext<MobileHeaderContextType>({ setPageHeader: () => {} });
export const useMobileHeader = () => useContext(MobileHeaderContext);

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const { businessName } = useBusiness();
  const [pageHeader, setPageHeader] = useState<ReactNode>(null);

  useEffect(() => {
    setSidebarOpen(false);
    if (mainRef.current) mainRef.current.scrollTo({ top: 0 });
    setIsTransitioning(true);
    const timeout = setTimeout(() => setIsTransitioning(false), 20);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return (
    <MobileHeaderContext.Provider value={{ setPageHeader }}>
      <div className="flex h-screen overflow-hidden bg-background">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main ref={mainRef} className="flex-1 lg:ml-64 flex flex-col overflow-y-auto min-w-0">
          {/* Mobile: single sticky block with menu bar + page header */}
          <div className="sticky top-0 z-30 lg:hidden bg-card shadow-sm">
            <div className="flex items-center justify-between h-16 px-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-muted transition-all duration-200 active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-[26px]">menu</span>
                </button>
                <div className="min-w-0">
                  <h1 className="text-[15px] font-bold tracking-tight text-foreground leading-tight">Al-Ribat Manager</h1>
                  {businessName && (
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">{businessName}</p>
                  )}
                </div>
              </div>
              <NotificationBell mobile />
            </div>
            {pageHeader && (
              <div className="border-t border-border">
                {pageHeader}
              </div>
            )}
          </div>

          <div
            className="flex-1 flex flex-col transition-opacity duration-300 ease-out"
            style={{ opacity: isTransitioning ? 0 : 1 }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </MobileHeaderContext.Provider>
  );
};

export default AppLayout;
