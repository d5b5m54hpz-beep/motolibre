"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bike, Users, FileText, ClipboardList, Activity, DollarSign, Wrench, Receipt } from "lucide-react";
import { formatMoney } from "@/lib/format";

interface KPIData {
  users: { total: number; thisMonth: number };
  events: { total: number; thisMonth: number };
  motos: { total: number; disponibles: number; alquiladas: number; enService: number };
  clientes: { total: number; pendientes: number };
  contratos: { activos: number; nuevosEsteMes: number };
  solicitudes: { pendientes: number; enEspera: number };
  mantenimientos: { hoy: number; semana: number };
  pagos: { cobradoEsteMes: number; pendientes: number };
  facturacion: { facturadoEsteMes: number; facturasEmitidas: number };
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
          ? `${data.pagos.pendientes} confirmados hoy`
          : "Sin pagos confirmados hoy",
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      title: "Clientes",
      value: data.clientes.total || "—",
      subtitle:
        data.clientes.pendientes > 0
          ? `${data.clientes.pendientes} pendientes de aprobación`
          : data.clientes.total > 0
            ? "Todos aprobados"
            : "Se activa en Fase 1",
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
      title: "Solicitudes",
      value: data.solicitudes.pendientes + data.solicitudes.enEspera || "—",
      subtitle:
        data.solicitudes.pendientes > 0
          ? `${data.solicitudes.pendientes} por evaluar · ${data.solicitudes.enEspera} en espera`
          : data.solicitudes.enEspera > 0
            ? `${data.solicitudes.enEspera} en lista de espera`
            : "Sin solicitudes activas",
      icon: ClipboardList,
      color: "text-orange-500",
    },
    {
      title: "Mantenimientos",
      value: data.mantenimientos.semana || "—",
      subtitle:
        data.mantenimientos.hoy > 0
          ? `${data.mantenimientos.hoy} hoy · ${data.mantenimientos.semana} esta semana`
          : data.mantenimientos.semana > 0
            ? `${data.mantenimientos.semana} esta semana`
            : "Sin mantenimientos próximos",
      icon: Wrench,
      color: "text-yellow-500",
    },
    {
      title: "Facturado este Mes",
      value: data.facturacion.facturadoEsteMes > 0
        ? formatMoney(data.facturacion.facturadoEsteMes)
        : "—",
      subtitle: `${data.facturacion.facturasEmitidas} facturas emitidas`,
      icon: Receipt,
      color: "text-pink-500",
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
