"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bike, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const links = [
  { href: "/catalogo", label: "Catálogo" },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <Button size="sm" asChild>
            <Link href="/registro">Alquilar Ahora</Link>
          </Button>
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
          <Button size="sm" className="w-full" asChild>
            <Link href="/registro" onClick={() => setMobileOpen(false)}>
              Alquilar Ahora
            </Link>
          </Button>
        </div>
      )}
    </header>
  );
}
