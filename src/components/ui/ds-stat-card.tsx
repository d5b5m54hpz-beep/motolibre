import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label?: string };
  icon?: LucideIcon;
  iconColor?: "accent" | "positive" | "negative" | "info" | "warning";
}

const colorMap = {
  accent: "bg-accent-bg text-accent-DEFAULT",
  positive: "bg-positive-bg text-positive",
  negative: "bg-negative-bg text-negative",
  info: "bg-info-bg text-ds-info",
  warning: "bg-warning-bg text-warning",
};

export function DSStatCard({ title, value, subtitle, trend, icon: Icon, iconColor = "accent" }: StatCardProps) {
  return (
    <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-glow/10 hover:border-border-hover">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-medium text-t-secondary uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={cn("p-2 rounded-xl", colorMap[iconColor])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="font-display text-3xl font-extrabold tracking-tighter text-t-primary">
        {value}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {trend && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-semibold",
            trend.value >= 0 ? "text-positive" : "text-negative"
          )}>
            {trend.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </span>
        )}
        {subtitle && <span className="text-xs text-t-tertiary">{subtitle}</span>}
      </div>
    </div>
  );
}
