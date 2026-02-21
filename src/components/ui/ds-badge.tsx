import { cn } from "@/lib/utils";

type BadgeVariant = "accent" | "positive" | "negative" | "info" | "warning" | "neutral";

const variants: Record<BadgeVariant, string> = {
  accent: "bg-accent-bg text-accent-DEFAULT",
  positive: "bg-positive-bg text-positive",
  negative: "bg-negative-bg text-negative",
  info: "bg-info-bg text-ds-info",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-bg-input text-t-secondary",
};

export function DSBadge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
