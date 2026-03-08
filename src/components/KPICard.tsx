import { type LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "gold" | "navy";
}

const KPICard = ({ title, value, subtitle, icon: Icon, trend, variant = "default" }: KPICardProps) => {
  const variantStyles = {
    default: "bg-card border border-border shadow-card hover:shadow-card-hover",
    gold: "gradient-gold text-accent-foreground",
    navy: "gradient-navy text-primary-foreground",
  };

  const iconBg = {
    default: "bg-accent/50 text-accent",
    gold: "bg-accent-foreground/15 text-accent-foreground",
    navy: "bg-primary-foreground/15 text-primary-foreground",
  };

  const subtitleColor = {
    default: "text-muted-foreground",
    gold: "text-accent-foreground/70",
    navy: "text-primary-foreground/70",
  };

  return (
    <div className={`rounded-xl p-5 transition-all duration-300 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className={`text-xs font-semibold uppercase tracking-wider ${subtitleColor[variant]}`}>
            {title}
          </p>
          <p className="text-2xl font-extrabold tracking-tight">{value}</p>
          {subtitle && (
            <p className={`text-xs ${subtitleColor[variant]}`}>{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={`text-xs font-semibold ${
                  trend.positive ? "text-success" : "text-destructive"
                }`}
              >
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
              <span className={`text-xs ${subtitleColor[variant]}`}>vs last month</span>
            </div>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${iconBg[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
