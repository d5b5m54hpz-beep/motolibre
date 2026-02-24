"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Bike, ClipboardList, CreditCard, Bell } from "lucide-react";

const tabs = [
  { title: "Home", href: "/admin", icon: LayoutDashboard },
  { title: "Motos", href: "/admin/motos", icon: Bike },
  { title: "Solicitudes", href: "/admin/solicitudes", icon: ClipboardList },
  { title: "Pagos", href: "/admin/pagos", icon: CreditCard },
  { title: "Alertas", href: "/admin/alertas", icon: Bell },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden border-t border-[var(--border-base)] bg-[var(--bg-sidebar)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
              isActive ? "text-accent-DEFAULT" : "text-t-tertiary"
            )}
          >
            <tab.icon className={cn("h-5 w-5", isActive && "text-accent-DEFAULT")} />
            {tab.title}
          </Link>
        );
      })}
    </nav>
  );
}
