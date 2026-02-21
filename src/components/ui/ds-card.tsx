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
        "bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6",
        hover && "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-glow/10 hover:border-border-hover",
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
        "rounded-2xl p-8 text-white",
        "bg-gradient-to-br from-[#7B61FF] to-[#4DA6FF]",
        "shadow-lg shadow-accent-glow/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
