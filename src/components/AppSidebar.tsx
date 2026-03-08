import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: "home", label: "Home", path: "/" },
  { icon: "storefront", label: "Business", path: "/business" },
  { icon: "receipt_long", label: "Sales", path: "/sales" },
  { icon: "person_search", label: "Customers", path: "/customers" },
  { icon: "group", label: "Partners", path: "/partners" },
  { icon: "inventory_2", label: "Inventory", path: "/inventory" },
  { icon: "currency_exchange", label: "Wallet", path: "/wallet" },
  { icon: "swap_horiz", label: "Transactions", path: "/transactions" },
  { icon: "account_balance_wallet", label: "Expenses", path: "/expenses" },
  { icon: "assignment_return", label: "Returns", path: "/returns" },
  { icon: "description", label: "Reports", path: "/reports" },
];

const AppSidebar = ({ open, onClose }: AppSidebarProps) => {
  const location = useLocation();
  const { signOut } = useAuth();

  const linkClass = (path: string) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
        : "text-sidebar-foreground hover:bg-muted hover:translate-x-0.5"
    }`;
  };

  const iconStyle = (path: string) =>
    location.pathname === path
      ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
      : undefined;

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="p-4 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <span className="material-symbols-outlined text-lg">dashboard</span>
          </div>
          <h1 className="text-base font-bold tracking-tight text-foreground">Al-Ribat Manager</h1>
        </div>
        <button onClick={onClose} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 sm:px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={linkClass(item.path)}>
            <span className="material-symbols-outlined text-[22px]" style={iconStyle(item.path)}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-sidebar-border">
        <NavLink to="/settings" className={linkClass("/settings")}>
          <span className="material-symbols-outlined text-[22px]" style={iconStyle("/settings")}>settings</span>
          <span>Settings</span>
        </NavLink>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-muted transition-all duration-200 active:scale-[0.97] w-full mt-1"
        >
          <span className="material-symbols-outlined text-[22px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
