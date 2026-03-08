import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { icon: "home", activeIcon: "home", label: "Home", path: "/" },
  { icon: "inventory_2", activeIcon: "inventory_2", label: "Inventory", path: "/inventory" },
  { icon: "receipt_long", activeIcon: "receipt_long", label: "Sales", path: "/sales" },
  { icon: "account_balance_wallet", activeIcon: "account_balance_wallet", label: "Expenses", path: "/expenses" },
  { icon: "group", activeIcon: "group", label: "Partners", path: "/partners" },
  { icon: "description", activeIcon: "description", label: "Reports", path: "/reports" },
];

const AppSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
          <span className="material-symbols-outlined text-lg">dashboard</span>
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground">Al-Ribat Manager</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-muted transition-colors"
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <NavLink
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-muted"
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
          <span>Settings</span>
        </NavLink>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-muted transition-colors w-full mt-1"
        >
          <span className="material-symbols-outlined text-[22px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
