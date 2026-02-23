"use client";

import { useSession, signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos dias";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function AppHeader() {
  const { data: session } = useSession();
  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] ?? "";
  const [alertCount, setAlertCount] = useState(0);

  const fetchAlertCount = useCallback(() => {
    fetch("/api/alertas/count")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.count != null) setAlertCount(d.count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchAlertCount]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border-base)] bg-[var(--bg-primary)]/80 backdrop-blur-sm px-4">
      {/* Greeting */}
      <div className="hidden md:block">
        <span className="text-sm text-t-secondary">
          {getGreeting()}, <span className="text-t-primary font-medium">{firstName}</span>
        </span>
      </div>

      <div className="flex-1" />

      {/* Right side: Theme + Bell + Avatar */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <Link
          href="/admin/alertas"
          className="relative p-2 rounded-xl bg-bg-input border border-border hover:border-border-hover transition-all duration-200"
        >
          <Bell className="h-4 w-4 text-t-secondary" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
              {alertCount}
            </span>
          )}
        </Link>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                  <AvatarFallback className="bg-accent-DEFAULT text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Rol: {user.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/configuracion">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuracion
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login-admin" })}
                className="text-negative focus:text-negative"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
