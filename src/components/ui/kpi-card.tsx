import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: number; positive: boolean };
  description?: string;
  className?: string;
}

export function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  description,
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card p-6 transition-all hover:shadow-md",
        className
      )}
    >
      {/* Decorative icon */}
      {Icon && (
        <div className="absolute top-4 right-4 text-muted-foreground/15">
          <Icon className="h-10 w-10" />
        </div>
      )}

      {/* Label */}
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      {/* Value */}
      <p className="mt-1 text-3xl font-bold font-mono tabular-nums tracking-tight">
        {value}
      </p>

      {/* Trend + Description */}
      <div className="mt-2 flex items-center gap-2">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
              trend.positive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
            )}
          >
            {trend.positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  );
}
