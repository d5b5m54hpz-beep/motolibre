import { cn } from "@/lib/utils";

export function DSCard({
  children,
  className,
  hover = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5",
        hover && "transition-colors hover:border-border-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DSCardHero({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
