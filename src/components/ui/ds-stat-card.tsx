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
  accent: "text-accent-DEFAULT",
  positive: "text-positive",
  negative: "text-negative",
  info: "text-ds-info",
  warning: "text-warning",
};

export function DSStatCard({ title, value, subtitle, trend, icon: Icon, iconColor = "accent" }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-t-secondary">{title}</span>
        {Icon && (
          <Icon className={cn("h-4 w-4", colorMap[iconColor])} />
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-t-primary font-mono tabular-nums">
        {value}
      </div>
      {(trend || subtitle) && (
        <div className="flex items-center gap-2 mt-1.5">
          {trend && (
            <span className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              trend.value >= 0 ? "text-positive" : "text-negative"
            )}>
              {trend.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend.value)}%
            </span>
          )}
          {subtitle && <span className="text-xs text-t-tertiary">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
