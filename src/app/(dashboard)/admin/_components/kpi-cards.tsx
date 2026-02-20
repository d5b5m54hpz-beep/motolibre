"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bike, Users, FileText, CreditCard, TrendingUp, Activity, DollarSign } from "lucide-react";
import { formatMoney } from "@/lib/format";

interface KPIData {
  users: { total: number; thisMonth: number };
  events: { total: number; thisMonth: number };
  motos: { total: number; disponibles: number; alquiladas: number; enService: number };
  contratos: { activos: number; nuevosEsteMes: number };
  pagos: { cobradoEsteMes: number; pendientes: number };
  facturacion: { facturadoEsteMes: number };
}

interface KPICardsProps {
  data: KPIData;
}

export function KPICards({ data }: KPICardsProps) {
  const cards = [
    {
      title: "Motos en Flota",
      value: data.motos.total || "—",
      subtitle:
        data.motos.total > 0
          ? `${data.motos.disponibles} disponibles · ${data.motos.alquiladas} alquiladas`
          : "Se activa en Fase 1",
      icon: Bike,
      color: "text-[#23e0ff]",
    },
    {
      title: "Contratos Activos",
      value: data.contratos.activos || "—",
      subtitle:
        data.contratos.activos > 0
          ? `${data.contratos.nuevosEsteMes} nuevos este mes`
          : "Se activa en Fase 1",
      icon: FileText,
      color: "text-green-500",
    },
    {
      title: "Cobrado este Mes",
      value: data.pagos.cobradoEsteMes > 0 ? formatMoney(data.pagos.cobradoEsteMes) : "—",
      subtitle:
        data.pagos.pendientes > 0
          ? `${data.pagos.pendientes} pagos pendientes`
          : "Se activa en Fase 1",
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      title: "Usuarios",
      value: data.users.total,
      subtitle:
        data.users.thisMonth > 0
          ? `+${data.users.thisMonth} este mes`
          : "Primer usuario creado",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Eventos del Sistema",
      value: data.events.total,
      subtitle: `${data.events.thisMonth} este mes`,
      icon: Activity,
      color: "text-purple-500",
    },
    {
      title: "Facturado este Mes",
      value:
        data.facturacion.facturadoEsteMes > 0
          ? formatMoney(data.facturacion.facturadoEsteMes)
          : "—",
      subtitle: "Se activa en Fase 1",
      icon: TrendingUp,
      color: "text-yellow-500",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
