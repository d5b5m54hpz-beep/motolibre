"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bike, CreditCard, LayoutDashboard, LogOut, Menu, UserCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const links = [
  { href: "/catalogo", label: "Catálogo" },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-50 bg-bg-card/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/catalogo" className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-[var(--ds-accent)] to-[var(--ds-info)] p-2 rounded-xl">
            <Bike className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-extrabold text-xl text-t-primary">
            MotoLibre
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname.startsWith(link.href)
                  ? "text-accent-DEFAULT"
                  : "text-t-secondary hover:text-t-primary"
              )}
            >
              {link.label}
            </Link>
          ))}

          {status === "authenticated" && user ? (
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
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/mi-cuenta">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Mi Cuenta
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/mi-cuenta/pagos">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Mis Pagos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/mi-cuenta/perfil">
                    <UserCircle className="mr-2 h-4 w-4" />
                    Mi Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/catalogo" })}
                  className="text-red-400 focus:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" asChild>
              <Link href="/catalogo">Alquilar Ahora</Link>
            </Button>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg text-t-secondary hover:text-t-primary"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-bg-card px-4 py-4 space-y-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-t-secondary hover:text-t-primary"
            >
              {link.label}
            </Link>
          ))}
          {status === "authenticated" && user ? (
            <>
              <Link
                href="/mi-cuenta"
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-t-secondary hover:text-t-primary"
              >
                Mi Cuenta
              </Link>
              <Link
                href="/mi-cuenta/pagos"
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-t-secondary hover:text-t-primary"
              >
                Mis Pagos
              </Link>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  void signOut({ callbackUrl: "/catalogo" });
                }}
                className="block text-sm font-medium text-red-400 hover:text-red-300"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <Button size="sm" className="w-full" asChild>
              <Link href="/catalogo" onClick={() => setMobileOpen(false)}>
                Alquilar Ahora
              </Link>
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
