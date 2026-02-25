import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { TarifasTable } from "./_components/tarifas-table";
import { formatMoney } from "@/lib/format";
import { DollarSign, Bike, TrendingUp, Clock } from "lucide-react";

async function getTarifas() {
  return prisma.tarifaAlquiler.findMany({
    orderBy: [
      { marca: "asc" },
      { modelo: "asc" },
      { condicion: "asc" },
      { plan: "asc" },
      { frecuencia: "asc" },
    ],
  });
}

async function getStats() {
  const [totalActivas, modelos, avgPrecio, ultimaActualizacion] =
    await Promise.all([
      prisma.tarifaAlquiler.count({ where: { activo: true } }),
      prisma.tarifaAlquiler.findMany({
        select: { marca: true, modelo: true },
        distinct: ["marca", "modelo"],
        where: { activo: true },
      }),
      prisma.tarifaAlquiler.aggregate({
        _avg: { precio: true },
        where: { activo: true, frecuencia: "MENSUAL" },
      }),
      prisma.tarifaAlquiler.findFirst({
        select: { updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  // Get distinct marcas for filters
  const marcasRaw = await prisma.tarifaAlquiler.findMany({
    select: { marca: true },
    distinct: ["marca"],
    orderBy: { marca: "asc" },
  });

  return {
    totalActivas,
    modelosConTarifa: modelos.length,
    promedioMensual: avgPrecio._avg.precio
      ? Number(avgPrecio._avg.precio)
      : 0,
    ultimaActualizacion: ultimaActualizacion?.updatedAt ?? null,
    marcas: marcasRaw.map((m) => m.marca),
  };
}

export default async function TarifasAlquilerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [rawTarifas, stats] = await Promise.all([getTarifas(), getStats()]);

  const tableData = rawTarifas.map((t) => ({
    id: t.id,
    marca: t.marca,
    modelo: t.modelo,
    condicion: t.condicion,
    plan: t.plan,
    frecuencia: t.frecuencia,
    precio: Number(t.precio),
    costoAmortizacion: t.costoAmortizacion ? Number(t.costoAmortizacion) : null,
    costoMantenimiento: t.costoMantenimiento
      ? Number(t.costoMantenimiento)
      : null,
    costoSeguro: t.costoSeguro ? Number(t.costoSeguro) : null,
    costoPatente: t.costoPatente ? Number(t.costoPatente) : null,
    costoOperativo: t.costoOperativo ? Number(t.costoOperativo) : null,
    margenPct: t.margenPct,
    activo: t.activo,
    vigenciaDesde: t.vigenciaDesde.toISOString(),
    vigenciaHasta: t.vigenciaHasta?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarifas de Alquiler"
        description="Gestion de precios de alquiler por modelo, condicion y plan"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Tarifas Activas"
          value={stats.totalActivas}
          icon={DollarSign}
          description="tarifas vigentes"
        />
        <KPICard
          label="Modelos con Tarifa"
          value={stats.modelosConTarifa}
          icon={Bike}
          description="marca/modelo distintos"
        />
        <KPICard
          label="Promedio Mensual"
          value={formatMoney(stats.promedioMensual)}
          icon={TrendingUp}
          description="precio mensual promedio"
        />
        <KPICard
          label="Ultima Actualizacion"
          value={
            stats.ultimaActualizacion
              ? stats.ultimaActualizacion.toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "--"
          }
          icon={Clock}
          description="ultimo cambio de tarifa"
        />
      </div>

      <TarifasTable data={tableData} marcas={stats.marcas} />
    </div>
  );
}
