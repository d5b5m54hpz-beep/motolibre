"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import {
  TrendingUp, CreditCard, BarChart3,
} from "lucide-react";

interface Indicadores {
  ingresoPorMoto: number;
  gastoPromedioPorMoto: number;
  margenOperativo: number;
  tasaOcupacion: number;
  tasaMorosidad: number;
  diasPromedioCobro: number;
  recaudacionVsFacturado: number;
  roi: number;
  margenNeto: number;
  ejecucionPresupuestaria: number;
  desvioPresupuestario: number;
}

interface IndicadorCard {
  nombre: string;
  valor: string;
  formato: "percent" | "money" | "days";
  color: string;
  tooltip: string;
}

export default function IndicadoresPage() {
  const [data, setData] = useState<Indicadores | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/finanzas/indicadores");
    if (res.ok) {
      const json = await res.json();
      setData(json.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Indicadores Financieros" description="Métricas clave del negocio" />
        <div className="text-center py-12 text-muted-foreground">Cargando indicadores...</div>
      </div>
    );
  }

  if (!data) return null;

  const sections: Array<{
    title: string;
    icon: React.ReactNode;
    cards: IndicadorCard[];
  }> = [
    {
      title: "Operativos",
      icon: <BarChart3 className="h-5 w-5" />,
      cards: [
        {
          nombre: "Ingreso por Moto",
          valor: formatMoney(data.ingresoPorMoto),
          formato: "money",
          color: data.ingresoPorMoto > 0 ? "text-emerald-500" : "text-muted-foreground",
          tooltip: "Ingreso total del mes dividido por motos alquiladas",
        },
        {
          nombre: "Gasto Promedio por Moto",
          valor: formatMoney(data.gastoPromedioPorMoto),
          formato: "money",
          color: "text-amber-500",
          tooltip: "Gasto total del mes dividido por total de motos",
        },
        {
          nombre: "Margen Operativo",
          valor: `${data.margenOperativo.toFixed(1)}%`,
          formato: "percent",
          color: data.margenOperativo >= 0 ? "text-emerald-500" : "text-red-500",
          tooltip: "(Ingresos - Costos) / Ingresos × 100",
        },
        {
          nombre: "Tasa de Ocupación",
          valor: `${data.tasaOcupacion.toFixed(1)}%`,
          formato: "percent",
          color: data.tasaOcupacion >= 70 ? "text-emerald-500" : data.tasaOcupacion >= 50 ? "text-amber-500" : "text-red-500",
          tooltip: "Motos alquiladas / Total motos × 100",
        },
      ],
    },
    {
      title: "Cobranza",
      icon: <CreditCard className="h-5 w-5" />,
      cards: [
        {
          nombre: "Tasa de Morosidad",
          valor: `${data.tasaMorosidad.toFixed(1)}%`,
          formato: "percent",
          color: data.tasaMorosidad <= 5 ? "text-emerald-500" : data.tasaMorosidad <= 15 ? "text-amber-500" : "text-red-500",
          tooltip: "Cuotas vencidas / Total cuotas × 100",
        },
        {
          nombre: "Días Promedio de Cobro",
          valor: `${data.diasPromedioCobro.toFixed(0)} días`,
          formato: "days",
          color: data.diasPromedioCobro <= 7 ? "text-emerald-500" : data.diasPromedioCobro <= 15 ? "text-amber-500" : "text-red-500",
          tooltip: "Promedio de días entre vencimiento y cobro de cuotas",
        },
        {
          nombre: "Recaudación vs Facturado",
          valor: `${data.recaudacionVsFacturado.toFixed(1)}%`,
          formato: "percent",
          color: data.recaudacionVsFacturado >= 90 ? "text-emerald-500" : data.recaudacionVsFacturado >= 70 ? "text-amber-500" : "text-red-500",
          tooltip: "Total cobrado / Total facturado × 100 (este mes)",
        },
      ],
    },
    {
      title: "Financieros",
      icon: <TrendingUp className="h-5 w-5" />,
      cards: [
        {
          nombre: "Margen Neto",
          valor: `${data.margenNeto.toFixed(1)}%`,
          formato: "percent",
          color: data.margenNeto >= 0 ? "text-emerald-500" : "text-red-500",
          tooltip: "Resultado Neto / Ingresos × 100",
        },
        {
          nombre: "Ejecución Presupuestaria",
          valor: `${data.ejecucionPresupuestaria.toFixed(1)}%`,
          formato: "percent",
          color: data.ejecucionPresupuestaria <= 100 ? "text-blue-500" : "text-red-500",
          tooltip: "Total ejecutado / Total presupuestado × 100",
        },
        {
          nombre: "Desvío Presupuestario",
          valor: `${data.desvioPresupuestario >= 0 ? "+" : ""}${data.desvioPresupuestario.toFixed(1)}%`,
          formato: "percent",
          color: Math.abs(data.desvioPresupuestario) <= 10 ? "text-emerald-500" : "text-amber-500",
          tooltip: "(Ejecutado - Presupuestado) / Presupuestado × 100",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indicadores Financieros"
        description="Métricas operativas, de cobranza y financieras"
      />

      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            {section.icon} {section.title}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {section.cards.map((card) => (
              <Card key={card.nombre} className="group relative">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{card.nombre}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.valor}</p>
                </CardContent>
                <div className="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity pb-2 pointer-events-none">
                  <span className="text-[10px] text-muted-foreground bg-background/90 px-2 py-1 rounded border">
                    {card.tooltip}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
