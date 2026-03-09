import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useTheme } from "@/contexts/ThemeContext";
import appLogo from "@/assets/logo.png";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: "home", label: "Home", path: "/", soloHidden: false },
  { icon: "storefront", label: "Business", path: "/business", soloHidden: false },
  { icon: "receipt_long", label: "Sales", path: "/sales", soloHidden: false },
  { icon: "person_search", label: "Customers", path: "/customers", soloHidden: false },
  { icon: "group", label: "Partners", path: "/partners", soloHidden: true },
  { icon: "inventory_2", label: "Inventory", path: "/inventory", soloHidden: false },
  { icon: "currency_exchange", label: "Exchange", path: "/wallet", soloHidden: true },
  { icon: "swap_horiz", label: "Send to Partners", path: "/transactions", soloHidden: true },
  { icon: "account_balance_wallet", label: "Expenses", path: "/expenses", soloHidden: false },
  { icon: "assignment_return", label: "Returns", path: "/returns", soloHidden: false },
  { icon: "description", label: "Reports", path: "/reports", soloHidden: false },
];

const AppSidebar = ({ open, onClose }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { userRole, businessName, isSolo } = useBusiness();
  const { theme, toggleTheme } = useTheme();

  const displayName = user?.user_metadata?.full_name || user?.email || "User";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

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
      <div className="p-4 sm:p-6 flex flex-col gap-1">
        <div className="flex items-center justify-between">
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
        {businessName && (
          <p className="text-xs text-muted-foreground font-medium pl-11 truncate">{businessName}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 sm:px-4 space-y-1 overflow-y-auto">
        {navItems.filter(item => !isSolo || !item.soloHidden).map((item) => (
          <NavLink key={item.path} to={item.path} className={linkClass(item.path)}>
            <span className="material-symbols-outlined text-[22px]" style={iconStyle(item.path)}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="p-3 sm:p-4 border-t border-sidebar-border space-y-2">
        <button
          onClick={() => { navigate("/profile"); onClose(); }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-all duration-200 active:scale-[0.97] w-full text-left"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{userRole || "member"}</p>
          </div>
          <span className="material-symbols-outlined text-[16px] text-muted-foreground">chevron_right</span>
        </button>
        <NavLink to="/settings" className={linkClass("/settings")}>
          <span className="material-symbols-outlined text-[22px]" style={iconStyle("/settings")}>settings</span>
          <span>Settings</span>
        </NavLink>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-muted transition-all duration-200 active:scale-[0.97] w-full"
        >
          <span className="material-symbols-outlined text-[22px]">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
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
