"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CreditCard, UserCircle } from "lucide-react";

const tabs = [
  { href: "/mi-cuenta", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/mi-cuenta/pagos", label: "Pagos", icon: CreditCard, exact: false },
  { href: "/mi-cuenta/perfil", label: "Perfil", icon: UserCircle, exact: true },
];

export function MiCuentaTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-border pb-px">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px",
              isActive
                ? "border-[var(--ds-accent)] text-[var(--ds-accent)] bg-[var(--ds-accent)]/5"
                : "border-transparent text-t-tertiary hover:text-t-secondary"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
