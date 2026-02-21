import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-2xl animate-shimmer bg-gradient-to-r from-bg-card via-bg-card-hover to-bg-card bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
