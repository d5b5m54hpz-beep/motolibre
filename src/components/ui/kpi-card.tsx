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
        "rounded-lg border bg-card p-5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-t-secondary">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-t-tertiary" />}
      </div>

      <p className="mt-2 text-2xl font-semibold font-mono tabular-nums tracking-tight text-t-primary">
        {value}
      </p>

      {(trend || description) && (
        <div className="mt-1.5 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                trend.positive ? "text-positive" : "text-negative"
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
            <span className="text-xs text-t-tertiary">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
