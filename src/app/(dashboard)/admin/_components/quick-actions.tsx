"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardList, Clock, Wrench, DollarSign, Receipt, PiggyBank, FileInput, TrendingUp, Target, ShoppingCart, AlertTriangle, Ship } from "lucide-react";

export function QuickActions() {
  const actions = [
    { title: "Solicitudes Pendientes", href: "/admin/solicitudes?estado=PAGADA", icon: ClipboardList, color: "text-warning" },
    { title: "Lista de Espera", href: "/admin/solicitudes?estado=EN_ESPERA", icon: Clock, color: "text-ds-info" },
    { title: "Ver Pagos", href: "/admin/pagos", icon: DollarSign, color: "text-positive" },
    { title: "Facturas Pendientes", href: "/admin/facturas?estado=GENERADA", icon: Receipt, color: "text-accent-DEFAULT" },
    { title: "Mantenimientos Hoy", href: "/admin/mantenimientos?estado=PROGRAMADO", icon: Wrench, color: "text-warning" },
    { title: "OTs Pendientes", href: "/admin/mantenimientos/ordenes?estado=SOLICITADA", icon: ClipboardList, color: "text-ds-info" },
    { title: "Gastos por Aprobar", href: "/admin/gastos?estado=PENDIENTE", icon: PiggyBank, color: "text-accent-DEFAULT" },
    { title: "Facturas por Pagar", href: "/admin/facturas-compra?estado=PENDIENTE", icon: FileInput, color: "text-negative" },
    { title: "Estado Resultados", href: "/admin/finanzas/estado-resultados", icon: TrendingUp, color: "text-positive" },
    { title: "Rentabilidad Motos", href: "/admin/finanzas/rentabilidad", icon: Target, color: "text-ds-info" },
    { title: "OC Pendientes", href: "/admin/ordenes-compra?estado=ENVIADA", icon: ShoppingCart, color: "text-warning" },
    { title: "Stock Bajo", href: "/admin/repuestos?stockBajo=true", icon: AlertTriangle, color: "text-negative" },
    { title: "Embarques en Transito", href: "/admin/importaciones?estado=EN_TRANSITO", icon: Ship, color: "text-ds-info" },
  ];

  return (
    <div className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6">
      <h3 className="text-xs font-medium text-t-secondary uppercase tracking-wider mb-4">
        Acciones Rapidas
      </h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button key={action.title} variant="ghost" size="sm" asChild className="border border-border hover:border-border-hover">
            <Link href={action.href}>
              <action.icon className={`mr-2 h-4 w-4 ${action.color}`} />
              {action.title}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
