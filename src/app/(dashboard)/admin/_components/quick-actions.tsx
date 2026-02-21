"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardList, Clock, Wrench, DollarSign, Receipt, PiggyBank, FileInput, TrendingUp, Target, ShoppingCart, AlertTriangle } from "lucide-react";

export function QuickActions() {
  const actions = [
    { title: "Solicitudes Pendientes", href: "/admin/solicitudes?estado=PAGADA", icon: ClipboardList, color: "text-yellow-500" },
    { title: "Lista de Espera", href: "/admin/solicitudes?estado=EN_ESPERA", icon: Clock, color: "text-blue-500" },
    { title: "Ver Pagos", href: "/admin/pagos", icon: DollarSign, color: "text-emerald-500" },
    { title: "Facturas Pendientes", href: "/admin/facturas?estado=GENERADA", icon: Receipt, color: "text-[#23e0ff]" },
    { title: "Mantenimientos Hoy", href: "/admin/mantenimientos?estado=PROGRAMADO", icon: Wrench, color: "text-orange-500" },
    { title: "OTs Pendientes", href: "/admin/mantenimientos/ordenes?estado=SOLICITADA", icon: ClipboardList, color: "text-cyan-500" },
    { title: "Gastos por Aprobar", href: "/admin/gastos?estado=PENDIENTE", icon: PiggyBank, color: "text-purple-500" },
    { title: "Facturas por Pagar", href: "/admin/facturas-compra?estado=PENDIENTE", icon: FileInput, color: "text-red-500" },
    { title: "Estado Resultados", href: "/admin/finanzas/estado-resultados", icon: TrendingUp, color: "text-indigo-500" },
    { title: "Rentabilidad Motos", href: "/admin/finanzas/rentabilidad", icon: Target, color: "text-teal-500" },
    { title: "OC Pendientes", href: "/admin/ordenes-compra?estado=ENVIADA", icon: ShoppingCart, color: "text-amber-500" },
    { title: "Stock Bajo", href: "/admin/repuestos?stockBajo=true", icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action.title} variant="outline" size="sm" asChild>
              <Link href={action.href}>
                <action.icon className={`mr-2 h-4 w-4 ${action.color}`} />
                {action.title}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
