"use client";

import { Bike, Users, FileText, ClipboardList, Activity, DollarSign, Wrench, Receipt, PiggyBank, FileInput, AlertTriangle, Ship } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/animated-number";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIData {
  users: { total: number; thisMonth: number };
  events: { total: number; thisMonth: number };
  motos: { total: number; disponibles: number; alquiladas: number; enService: number };
  clientes: { total: number; pendientes: number };
  contratos: { activos: number; nuevosEsteMes: number };
  solicitudes: { pendientes: number; enEspera: number };
  mantenimientos: { hoy: number; semana: number; otActivas?: number };
  pagos: { cobradoEsteMes: number; pendientes: number };
  facturacion: { facturadoEsteMes: number; facturasEmitidas: number };
  gastos?: { pendientes: number };
  facturasCompra?: { pendientesPago: number };
  inventario?: { stockBajo: number };
  embarques?: { activos: number };
}

interface KPICard {
  title: string;
  numericValue: number;
  emptyLabel: string;
  formatFn?: (n: number) => string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: "accent" | "positive" | "negative" | "info" | "warning";
}

interface KPICardsProps {
  data: KPIData;
}

const colorMap = {
  accent: "bg-accent-bg text-accent-DEFAULT",
  positive: "bg-positive-bg text-positive",
  negative: "bg-negative-bg text-negative",
  info: "bg-info-bg text-ds-info",
  warning: "bg-warning-bg text-warning",
};

export function KPICards({ data }: KPICardsProps) {
  const cards: KPICard[] = [
    {
      title: "Motos en Flota",
      numericValue: data.motos.total,
      emptyLabel: "--",
      subtitle:
        data.motos.total > 0
          ? `${data.motos.disponibles} disponibles · ${data.motos.alquiladas} alquiladas`
          : "Se activa en Fase 1",
      icon: Bike,
      iconColor: "info",
    },
    {
      title: "Contratos Activos",
      numericValue: data.contratos.activos,
      emptyLabel: "--",
      subtitle:
        data.contratos.activos > 0
          ? `${data.contratos.nuevosEsteMes} nuevos este mes`
          : "Se activa en Fase 1",
      icon: FileText,
      iconColor: "positive",
    },
    {
      title: "Cobrado este Mes",
      numericValue: data.pagos.cobradoEsteMes,
      emptyLabel: "--",
      formatFn: (n) => formatMoney(n),
      subtitle:
        data.pagos.pendientes > 0
          ? `${data.pagos.pendientes} confirmados hoy`
          : "Sin pagos confirmados hoy",
      icon: DollarSign,
      iconColor: "positive",
    },
    {
      title: "Clientes",
      numericValue: data.clientes.total,
      emptyLabel: "--",
      subtitle:
        data.clientes.pendientes > 0
          ? `${data.clientes.pendientes} pendientes de aprobacion`
          : data.clientes.total > 0
            ? "Todos aprobados"
            : "Se activa en Fase 1",
      icon: Users,
      iconColor: "info",
    },
    {
      title: "Eventos del Sistema",
      numericValue: data.events.total,
      emptyLabel: "0",
      subtitle: `${data.events.thisMonth} este mes`,
      icon: Activity,
      iconColor: "accent",
    },
    {
      title: "Solicitudes",
      numericValue: data.solicitudes.pendientes + data.solicitudes.enEspera,
      emptyLabel: "--",
      subtitle:
        data.solicitudes.pendientes > 0
          ? `${data.solicitudes.pendientes} por evaluar · ${data.solicitudes.enEspera} en espera`
          : data.solicitudes.enEspera > 0
            ? `${data.solicitudes.enEspera} en lista de espera`
            : "Sin solicitudes activas",
      icon: ClipboardList,
      iconColor: "warning",
    },
    {
      title: "Mantenimientos",
      numericValue: data.mantenimientos.semana,
      emptyLabel: "--",
      subtitle:
        data.mantenimientos.hoy > 0
          ? `${data.mantenimientos.hoy} hoy · ${data.mantenimientos.semana} esta semana`
          : data.mantenimientos.semana > 0
            ? `${data.mantenimientos.semana} esta semana`
            : "Sin mantenimientos proximos",
      icon: Wrench,
      iconColor: "warning",
    },
    {
      title: "OTs Activas",
      numericValue: data.mantenimientos.otActivas ?? 0,
      emptyLabel: "0",
      subtitle: data.mantenimientos.otActivas
        ? `${data.mantenimientos.otActivas} ordenes en curso`
        : "Sin OTs activas",
      icon: Wrench,
      iconColor: "info",
    },
    {
      title: "Facturado este Mes",
      numericValue: data.facturacion.facturadoEsteMes,
      emptyLabel: "--",
      formatFn: (n) => formatMoney(n),
      subtitle: `${data.facturacion.facturasEmitidas} facturas emitidas`,
      icon: Receipt,
      iconColor: "accent",
    },
    {
      title: "Gastos Pendientes",
      numericValue: data.gastos?.pendientes ?? 0,
      emptyLabel: "0",
      subtitle: data.gastos?.pendientes
        ? `${data.gastos.pendientes} por aprobar`
        : "Sin gastos pendientes",
      icon: PiggyBank,
      iconColor: "warning",
    },
    {
      title: "FC por Pagar",
      numericValue: data.facturasCompra?.pendientesPago ?? 0,
      emptyLabel: "0",
      subtitle: data.facturasCompra?.pendientesPago
        ? `${data.facturasCompra.pendientesPago} facturas pendientes`
        : "Sin facturas por pagar",
      icon: FileInput,
      iconColor: "negative",
    },
    {
      title: "Stock Bajo",
      numericValue: data.inventario?.stockBajo ?? 0,
      emptyLabel: "0",
      subtitle: data.inventario?.stockBajo
        ? `${data.inventario.stockBajo} repuestos bajo minimo`
        : "Stock OK -- sin alertas",
      icon: AlertTriangle,
      iconColor: (data.inventario?.stockBajo ?? 0) > 0 ? "negative" : "positive",
    },
    {
      title: "Embarques Activos",
      numericValue: data.embarques?.activos ?? 0,
      emptyLabel: "0",
      subtitle: data.embarques?.activos
        ? `${data.embarques.activos} embarques en curso`
        : "Sin embarques activos",
      icon: Ship,
      iconColor: "info",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-glow/10 hover:border-border-hover"
        >
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-medium text-t-secondary uppercase tracking-wider">
              {card.title}
            </span>
            <div className={cn("p-2 rounded-xl", colorMap[card.iconColor])}>
              <card.icon className="h-4 w-4" />
            </div>
          </div>
          <div className="font-display text-3xl font-extrabold tracking-tighter text-t-primary">
            {card.numericValue > 0 ? (
              <AnimatedNumber
                value={card.numericValue}
                formatFn={card.formatFn}
                duration={1.0}
              />
            ) : (
              card.emptyLabel
            )}
          </div>
          <p className="text-xs text-t-tertiary mt-2">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
