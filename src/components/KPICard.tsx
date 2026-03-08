import { type LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  trend?: { value: string; positive: boolean };
}

const KPICard = ({ title, value, subtitle, icon, iconColor = "text-primary bg-primary/10", trend }: KPICardProps) => {
  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <span className={`p-2 rounded-lg ${iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </span>
        {trend && (
          <span className={`text-xs font-medium flex items-center px-2 py-1 rounded-full ${
            trend.positive
              ? "text-success bg-success/10"
              : "text-destructive bg-destructive/10"
          }`}>
            {trend.positive ? "+" : ""}{trend.value}
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
    </div>
  );
};

export default KPICard;
