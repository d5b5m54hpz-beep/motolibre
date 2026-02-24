"use client";

import { useSession, signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { LogOut, Settings, Bell, Search } from "lucide-react";
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const router = useRouter();

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

  // Cmd+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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

      {/* Search trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex items-center gap-2 text-muted-foreground h-8 w-56 justify-start"
        onClick={() => setCmdOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Buscar...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Command Palette */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen} title="Búsqueda global" description="Buscar motos, contratos, riders, órdenes de trabajo...">
        <CommandInput placeholder="Buscar motos, contratos, riders..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          <CommandGroup heading="Navegación rápida">
            <CommandItem onSelect={() => { router.push("/admin/motos"); setCmdOpen(false); }}>
              Motos
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/mantenimientos"); setCmdOpen(false); }}>
              Mantenimientos
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/mantenimientos/ordenes"); setCmdOpen(false); }}>
              Órdenes de Trabajo
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/clientes"); setCmdOpen(false); }}>
              Clientes
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/contratos"); setCmdOpen(false); }}>
              Contratos
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/repuestos"); setCmdOpen(false); }}>
              Inventario
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

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
                <Link href="/admin/configuracion/empresa">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
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
