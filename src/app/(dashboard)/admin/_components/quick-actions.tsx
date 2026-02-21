"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardList, Clock, Wrench, DollarSign } from "lucide-react";

export function QuickActions() {
  const actions = [
    { title: "Solicitudes Pendientes", href: "/admin/solicitudes?estado=PAGADA", icon: ClipboardList, color: "text-yellow-500" },
    { title: "Lista de Espera", href: "/admin/solicitudes?estado=EN_ESPERA", icon: Clock, color: "text-blue-500" },
    { title: "Ver Pagos", href: "/admin/pagos", icon: DollarSign, color: "text-emerald-500" },
    { title: "Mantenimientos Hoy", href: "/admin/mantenimientos?estado=PROGRAMADO", icon: Wrench, color: "text-orange-500" },
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
