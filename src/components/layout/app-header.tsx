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
import {
  LogOut, Settings, Bell, Search, AlertTriangle, Sparkles,
  MessageCircle, Calculator, Tags, ClipboardList, ListChecks,
  FileText, ShoppingBag,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { navigation } from "@/lib/navigation";
import Link from "next/link";

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
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur-sm px-4">
      <div className="hidden md:block">
        {firstName && (
          <span className="text-sm text-t-secondary">{firstName}</span>
        )}
      </div>

      <div className="flex-1" />

      {/* Search trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex items-center gap-2 text-t-tertiary h-7 w-52 justify-start border-border"
        onClick={() => setCmdOpen(true)}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Buscar...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border bg-bg-input px-1 font-mono text-[10px] text-t-tertiary">
          <span className="text-[10px]">&#x2318;</span>K
        </kbd>
      </Button>

      {/* Command Palette */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen} title="Búsqueda global" description="Buscar páginas y acciones">
        <CommandInput placeholder="Buscar páginas, acciones..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          {navigation.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => { router.push(item.href); setCmdOpen(false); }}
                >
                  <item.icon className="mr-2 h-4 w-4 text-t-tertiary" />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandGroup heading="Acceso rápido">
            <CommandItem onSelect={() => { router.push("/admin/alertas"); setCmdOpen(false); }}>
              <AlertTriangle className="mr-2 h-4 w-4 text-t-tertiary" />
              Alertas
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/anomalias"); setCmdOpen(false); }}>
              <AlertTriangle className="mr-2 h-4 w-4 text-t-tertiary" />
              Anomalías
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/asistente"); setCmdOpen(false); }}>
              <Sparkles className="mr-2 h-4 w-4 text-t-tertiary" />
              Asistente Eve
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/chat"); setCmdOpen(false); }}>
              <MessageCircle className="mr-2 h-4 w-4 text-t-tertiary" />
              Conversaciones
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/pricing"); setCmdOpen(false); }}>
              <Calculator className="mr-2 h-4 w-4 text-t-tertiary" />
              Pricing Alquiler
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/pricing-repuestos"); setCmdOpen(false); }}>
              <Tags className="mr-2 h-4 w-4 text-t-tertiary" />
              Pricing Repuestos
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/mantenimientos/ordenes"); setCmdOpen(false); }}>
              <ClipboardList className="mr-2 h-4 w-4 text-t-tertiary" />
              Órdenes de Trabajo
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/mantenimientos/planes"); setCmdOpen(false); }}>
              <ListChecks className="mr-2 h-4 w-4 text-t-tertiary" />
              Planes Service
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/notas-credito"); setCmdOpen(false); }}>
              <FileText className="mr-2 h-4 w-4 text-t-tertiary" />
              Notas de Crédito
            </CommandItem>
            <CommandItem onSelect={() => { router.push("/admin/ventas-repuestos"); setCmdOpen(false); }}>
              <ShoppingBag className="mr-2 h-4 w-4 text-t-tertiary" />
              Ventas Repuestos
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Right side */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

        <Link
          href="/admin/alertas"
          className="relative p-1.5 rounded-md text-t-tertiary hover:text-t-secondary hover:bg-bg-card-hover transition-colors"
        >
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-negative px-0.5 text-[9px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </Link>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-7 w-7 rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                  <AvatarFallback className="bg-bg-card-hover text-t-secondary text-[10px] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-t-primary">{user.name}</p>
                  <p className="text-xs text-t-tertiary">{user.email}</p>
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
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
