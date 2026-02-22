import { cn } from "@/lib/utils";

export function DSTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border overflow-hidden", className)}>
      <table className="w-full">
        {children}
      </table>
    </div>
  );
}

export function DSTableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="bg-bg-input/50 border-b border-border">
        {children}
      </tr>
    </thead>
  );
}

export function DSTableHead({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-medium text-t-secondary uppercase tracking-wider", className)}>
      {children}
    </th>
  );
}

export function DSTableRow({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b border-border last:border-0 hover:bg-bg-card-hover transition-colors", className)} {...props}>
      {children}
    </tr>
  );
}

export function DSTableCell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3 text-sm text-t-primary", className)}>
      {children}
    </td>
  );
}
