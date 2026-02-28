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
import { PanelLeft, PanelRight, LogOut, ChevronDown } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "motolibre-nav-open";

// ── Split navigation: main vs pinned ─────────────────────────────────────────
const generalGroup = navigation[0]!;
const mainGroups = navigation.filter((g) => g !== generalGroup && !g.pinned);
const pinnedGroups = navigation.filter((g) => g.pinned);

// ── Hook: manage collapsible group state ─────────────────────────────────────
function useNavState(pathname: string) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let stored: string[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as string[];
    } catch {
      // ignore
    }

    const initial = new Set(stored);

    for (const group of navigation) {
      if (group.title === "General" || group.pinned) continue;
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

  useEffect(() => {
    if (!hydrated) return;
    for (const group of navigation) {
      if (group.title === "General" || group.pinned) continue;
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

// ── Single nav item (text-only in expanded, icon-only in collapsed) ──────────
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

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.title}
        className={cn(
          "flex items-center justify-center rounded-md p-2 transition-colors duration-100",
          isActive
            ? "bg-bg-card-hover text-t-primary"
            : "text-t-tertiary hover:bg-bg-card-hover hover:text-t-secondary"
        )}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center rounded-md px-2 py-1.5 text-[13px] transition-colors duration-100",
        isActive
          ? "bg-bg-card-hover text-t-primary font-medium"
          : "text-t-secondary hover:bg-bg-card-hover hover:text-t-primary"
      )}
    >
      <span className="truncate">{item.title}</span>
      {item.badge ? (
        <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-DEFAULT/15 px-1 text-[10px] font-medium text-accent-DEFAULT">
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
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  hasActiveChild: boolean;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "group/trigger flex w-full items-center gap-1.5 px-2 h-7 text-[11px] font-medium uppercase tracking-wider transition-colors duration-100",
            "text-t-tertiary hover:text-t-secondary"
          )}
        >
          <span className="truncate">{group.title}</span>
          <ChevronDown
            className={cn(
              "ml-auto h-3 w-3 shrink-0 text-t-tertiary/60 transition-transform duration-150",
              !isOpen && "-rotate-90"
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent
        className="overflow-hidden data-[state=open]:animate-[collapsible-down_150ms_ease-out] data-[state=closed]:animate-[collapsible-up_100ms_ease-out]"
        style={{ display: "grid" }}
      >
        <div className="min-h-0">
          <div className="space-y-px pt-0.5 pb-1">
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

  return (
    <Sidebar collapsible="icon">
      <div className="flex h-full flex-col overflow-hidden">
        {/* ── Header ─────────────────────────────────── */}
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-border",
            collapsed
              ? "h-14 flex-col justify-center gap-1.5 py-2 px-2"
              : "h-14 px-3.5 gap-2.5"
          )}
        >
          {collapsed ? (
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-md text-t-tertiary hover:text-t-primary hover:bg-bg-card-hover transition-colors"
              title="Expandir menú"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          ) : (
            <>
              <span className="text-t-primary font-semibold text-[15px] tracking-[-0.01em]">
                motolibre
              </span>
              <button
                onClick={toggleSidebar}
                className="ml-auto p-1 rounded-md text-t-tertiary hover:text-t-primary hover:bg-bg-card-hover transition-colors"
                title="Colapsar menú"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* ── Nav ───────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-2 py-2">
          {collapsed ? (
            <>
              {[generalGroup, ...mainGroups].map((group, gi) => (
                <div key={group.title}>
                  {gi > 0 && <div className="mx-1 my-2 h-px bg-border" />}
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
            <>
              {/* General — always open, no header */}
              <div className="space-y-px mb-2">
                {generalGroup?.items.map((item) => (
                  <NavItemLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    collapsed={false}
                  />
                ))}
              </div>

              {/* Separator */}
              <div className="mx-1 mb-2 h-px bg-border" />

              {/* Collapsible groups */}
              {hydrated &&
                mainGroups.map((group, gi) => (
                  <div key={group.title} className={cn(gi > 0 && "mt-3")}>
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

        {/* ── Footer: pinned + logout ──────────────── */}
        <div className="shrink-0 border-t border-border px-2 py-2">
          {collapsed ? (
            pinnedGroups.map((group) => (
              <div key={group.title} className="space-y-0.5 mb-1">
                {group.items.map((item) => (
                  <NavItemLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    collapsed
                  />
                ))}
              </div>
            ))
          ) : (
            hydrated &&
            pinnedGroups.map((group) => (
              <div key={group.title} className="mb-1">
                <NavGroupCollapsible
                  group={group}
                  isOpen={openGroups.has(group.title)}
                  onToggle={() => toggleGroup(group.title)}
                  pathname={pathname}
                  hasActiveChild={activeGroupSet.has(group.title)}
                />
              </div>
            ))
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/login-admin" })}
            title={collapsed ? "Cerrar sesión" : undefined}
            className={cn(
              "w-full flex items-center rounded-md text-[13px] text-t-tertiary hover:bg-bg-card-hover hover:text-t-primary transition-colors duration-100",
              collapsed ? "justify-center p-2" : "gap-2 px-2 py-1.5"
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
