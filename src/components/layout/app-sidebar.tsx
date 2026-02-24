"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { navigation, type NavItem as NavItemType, type NavGroup } from "@/lib/navigation";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { PanelLeft, PanelRight, LogOut, ChevronRight } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "motolibre-nav-open";

// ── Motolibre Icon (wing only, for collapsed state) ──────────────────────────
function MotolibreIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 26 C 7 22, 8 16, 13 13"
        stroke="#23DFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M12 12.5 L 30 9"
        stroke="#23DFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M11 18.5 L 29 16.5"
        stroke="#23DFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M10 24.5 L 28 24"
        stroke="#23DFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Wordmark ─────────────────────────────────────────────────────────────────
function MotolibreWordmark() {
  return (
    <span className="text-[#23DFFF] font-bold text-lg leading-none font-display tracking-[-0.02em]">
      motolibre
    </span>
  );
}

// ── Sidebar toggle button ────────────────────────────────────────────────────
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

// ── Hook: manage collapsible group state ─────────────────────────────────────
function useNavState(pathname: string) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // On mount: read localStorage + auto-open group with active route
  useEffect(() => {
    let stored: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as string[];
    } catch {
      // ignore
    }

    const initial = new Set(stored);

    // Auto-open group containing current pathname
    for (const group of navigation) {
      if (group.title === "General") continue;
      const hasActive = group.items.some(
        (item) =>
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href))
      );
      if (hasActive) initial.add(group.title);
    }

    setOpenGroups(initial);
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open group when pathname changes (navigation)
  useEffect(() => {
    if (!hydrated) return;
    for (const group of navigation) {
      if (group.title === "General") continue;
      const hasActive = group.items.some(
        (item) =>
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href))
      );
      if (hasActive && !openGroups.has(group.title)) {
        setOpenGroups((prev) => {
          const next = new Set(prev);
          next.add(group.title);
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
          return next;
        });
      }
    }
  }, [pathname, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = useCallback((title: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { openGroups, toggleGroup, hydrated };
}

// ── Single nav item ──────────────────────────────────────────────────────────
function NavItemLink({
  item,
  pathname,
  collapsed,
}: {
  item: NavItemType;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/admin" && pathname.startsWith(item.href));

  return (
    <Link
      href={item.href}
      title={collapsed ? item.title : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg text-[13px] transition-colors duration-150",
        collapsed ? "justify-center p-2.5" : "px-2.5 py-1.5",
        isActive
          ? "bg-accent-DEFAULT/10 text-accent-DEFAULT font-medium"
          : "text-t-secondary hover:bg-bg-card-hover hover:text-t-primary"
      )}
    >
      {/* Active left bar indicator */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-accent-DEFAULT rounded-r-full" />
      )}

      <item.icon
        className={cn(
          "shrink-0 h-[18px] w-[18px]",
          collapsed && "h-5 w-5",
          isActive ? "text-accent-DEFAULT" : "text-t-tertiary"
        )}
      />

      {!collapsed && <span className="truncate">{item.title}</span>}

      {/* Badge */}
      {!collapsed && item.badge ? (
        <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-DEFAULT px-1 text-[10px] font-semibold text-white">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

// ── Collapsible nav group ────────────────────────────────────────────────────
function NavGroupCollapsible({
  group,
  isOpen,
  onToggle,
  pathname,
  hasActiveChild,
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  hasActiveChild: boolean;
}) {
  const GroupIcon = group.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "group/trigger flex w-full items-center gap-2 rounded-lg px-2.5 h-7 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150",
            "hover:bg-bg-card-hover hover:text-white",
            hasActiveChild
              ? "text-white"
              : "text-t-tertiary"
          )}
        >
          <GroupIcon className={cn(
            "h-3.5 w-3.5 shrink-0 transition-opacity duration-150 group-hover/trigger:opacity-100",
            hasActiveChild ? "opacity-100" : "opacity-60"
          )} />
          <span className="truncate">{group.title}</span>
          <ChevronRight
            className={cn(
              "ml-auto h-3 w-3 shrink-0 text-t-tertiary group-hover/trigger:text-white transition-all duration-200",
              isOpen && "rotate-90",
              hasActiveChild && "text-white"
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent
        className="overflow-hidden data-[state=open]:animate-[collapsible-down_200ms_ease-out] data-[state=closed]:animate-[collapsible-up_150ms_ease-out]"
        style={{ display: "grid" }}
      >
        <div className="min-h-0">
          <div className="space-y-0.5 pt-0.5 pb-1">
            {group.items.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={false}
              />
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────────────
export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const { openGroups, toggleGroup, hydrated } = useNavState(pathname);

  const collapsed = state === "collapsed";

  // Precompute which groups have an active child
  const activeGroupSet = useMemo(() => {
    const set = new Set<string>();
    for (const group of navigation) {
      const has = group.items.some(
        (item) =>
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href))
      );
      if (has) set.add(group.title);
    }
    return set;
  }, [pathname]);

  const generalGroup = navigation[0];
  const restGroups = navigation.slice(1);

  return (
    <Sidebar collapsible="icon">
      <div className="flex h-full flex-col overflow-hidden">
        {/* ── Header / Logo ─────────────────────────────────── */}
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-border",
            collapsed
              ? "h-14 flex-col justify-center gap-1 py-2 px-2"
              : "h-14 px-4 gap-2.5"
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
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-2 px-2">
          {collapsed ? (
            /* ── Collapsed: flat icon list with dividers ── */
            <>
              {navigation.map((group, gi) => (
                <div key={group.title}>
                  {gi > 0 && <div className="mx-2 my-2 h-px bg-border" />}
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItemLink
                        key={item.href}
                        item={item}
                        pathname={pathname}
                        collapsed
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            /* ── Expanded: collapsible groups ── */
            <>
              {/* General group — always open, no collapsible */}
              <div className="space-y-0.5 mb-1">
                {generalGroup?.items.map((item) => (
                  <NavItemLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    collapsed={false}
                  />
                ))}
              </div>

              {/* Collapsible groups */}
              {hydrated &&
                restGroups.map((group) => (
                  <div key={group.title} className="mt-1">
                    <NavGroupCollapsible
                      group={group}
                      isOpen={openGroups.has(group.title)}
                      onToggle={() => toggleGroup(group.title)}
                      pathname={pathname}
                      hasActiveChild={activeGroupSet.has(group.title)}
                    />
                  </div>
                ))}
            </>
          )}
        </nav>

        {/* ── Footer ────────────────────────────────────────── */}
        <div
          className={cn(
            "shrink-0 border-t border-border py-3",
            collapsed ? "px-2" : "px-3"
          )}
        >
          <button
            onClick={() => signOut({ callbackUrl: "/login-admin" })}
            title={collapsed ? "Cerrar sesión" : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-lg text-sm text-t-secondary hover:bg-bg-card-hover hover:text-negative transition-colors duration-150",
              collapsed ? "justify-center p-2.5" : "px-2.5 py-1.5"
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
