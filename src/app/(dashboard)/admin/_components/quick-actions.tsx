"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, FileText, CreditCard, Wrench } from "lucide-react";

export function QuickActions() {
  const actions = [
    { title: "Nuevo Cliente", href: "/admin/clientes?new=true", icon: Users, color: "text-green-500" },
    { title: "Nuevo Contrato", href: "/admin/contratos?new=true", icon: FileText, color: "text-blue-500" },
    { title: "Registrar Pago", href: "/admin/pagos?new=true", icon: CreditCard, color: "text-emerald-500" },
    { title: "Orden de Trabajo", href: "/admin/mantenimientos?new=true", icon: Wrench, color: "text-orange-500" },
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
