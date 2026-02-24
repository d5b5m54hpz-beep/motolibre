"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { navigation } from "@/lib/navigation";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import { PanelLeft, PanelRight, LogOut } from "lucide-react";

// ── Motolibre Icon (wing only, for collapsed state) ──────────────────────────
function MotolibreIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Arc/body curve on the left */}
      <path
        d="M9 26 C 7 22, 8 16, 13 13"
        stroke="#23DFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Top feather/speed line */}
      <path
        d="M12 12.5 L 30 9"
        stroke="#23DFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Middle feather */}
      <path
        d="M11 18.5 L 29 16.5"
        stroke="#23DFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Bottom feather */}
      <path
        d="M10 24.5 L 28 24"
        stroke="#23DFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Wordmark ("motolibre" text) ───────────────────────────────────────────────
function MotolibreWordmark() {
  return (
    <span
      className="text-[#23DFFF] font-bold text-lg leading-none font-display tracking-[-0.02em]"
    >
      motolibre
    </span>
  );
}

// ── Sidebar toggle button ─────────────────────────────────────────────────────
function ToggleBtn({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 rounded-lg text-t-tertiary hover:text-t-primary hover:bg-bg-card-hover transition-all duration-200 shrink-0"
      title={collapsed ? "Expandir menú" : "Colapsar menú"}
    >
      {collapsed ? (
        <PanelRight className="h-4 w-4" />
      ) : (
        <PanelLeft className="h-4 w-4" />
      )}
    </button>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();

  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <div className="flex h-full flex-col overflow-hidden">
        {/* ── Header / Logo ─────────────────────────────────── */}
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-border",
            collapsed
              ? "h-[60px] flex-col justify-center gap-1.5 py-3 px-2"
              : "h-[60px] px-4 gap-2.5"
          )}
        >
          {collapsed ? (
            <>
              <MotolibreIcon className="w-7 h-7" />
              <ToggleBtn collapsed={collapsed} onToggle={toggleSidebar} />
            </>
          ) : (
            <>
              <MotolibreIcon className="w-7 h-7" />
              <MotolibreWordmark />
              <div className="ml-auto">
                <ToggleBtn collapsed={collapsed} onToggle={toggleSidebar} />
              </div>
            </>
          )}
        </div>

        {/* ── Nav ───────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin">
          {navigation.map((group, gi) => (
            <div key={group.title} className="mb-1">
              {/* Group label (expanded) or divider (collapsed) */}
              {!collapsed ? (
                <div className="px-4 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-t-tertiary">
                    {group.title}
                  </span>
                </div>
              ) : (
                gi > 0 && <div className="mx-3 my-2 h-px bg-border" />
              )}

              {/* Nav items */}
              <div className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" &&
                      pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xl text-sm transition-all duration-200",
                        collapsed
                          ? "justify-center p-2.5"
                          : "px-3 py-2",
                        isActive
                          ? "bg-accent-DEFAULT/10 text-accent-DEFAULT font-medium"
                          : "text-t-secondary hover:bg-bg-card-hover hover:text-t-primary"
                      )}
                    >
                      {/* Active left border indicator */}
                      {isActive && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent-DEFAULT rounded-r-full" />
                      )}

                      <item.icon
                        className={cn(
                          "shrink-0",
                          collapsed ? "h-5 w-5" : "h-4 w-4",
                          isActive
                            ? "text-accent-DEFAULT"
                            : "text-t-secondary"
                        )}
                      />

                      {!collapsed && (
                        <span className="truncate">{item.title}</span>
                      )}

                      {/* Badge */}
                      {!collapsed && item.badge ? (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-DEFAULT px-1.5 text-xs font-medium text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ────────────────────────────────────────── */}
        <div
          className={cn(
            "shrink-0 border-t border-border py-3 space-y-0.5",
            collapsed ? "px-2" : "px-3"
          )}
        >
          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: "/login-admin" })}
            title={collapsed ? "Cerrar sesión" : undefined}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl text-sm text-t-secondary hover:bg-bg-card-hover hover:text-negative transition-all duration-200",
              collapsed ? "justify-center p-2.5" : "px-3 py-2"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>
    </Sidebar>
  );
}
