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
    <div className="bg-card p-4 lg:p-6 rounded-xl border border-border shadow-card">
      <div className="flex items-center justify-between mb-2 lg:mb-4">
        <span className={`p-1.5 lg:p-2 rounded-lg ${iconColor}`}>
          <span className="material-symbols-outlined text-[20px] lg:text-[24px]">{icon}</span>
        </span>
        {trend && (
          <span className={`text-[10px] lg:text-xs font-medium flex items-center px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full ${
            trend.positive
              ? "text-emerald-600 bg-emerald-50"
              : "text-red-600 bg-red-50"
          }`}>
            {trend.positive ? "+" : ""}{trend.value}
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-xs lg:text-sm font-medium">{title}</p>
      <p className="text-lg lg:text-2xl font-bold mt-0.5 lg:mt-1 text-foreground">{value}</p>
      {subtitle && <p className="text-[10px] lg:text-xs text-muted-foreground mt-1 lg:mt-2">{subtitle}</p>}
    </div>
  );
};

export default KPICard;
