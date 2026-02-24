import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { OTTable } from "./_components/ot-table";
import { Clock, CheckCircle2, DollarSign, Timer } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { Prisma } from "@prisma/client";

async function getOrdenes(
  estado: string | null,
  tipo: string | null,
  prioridad: string | null
) {
  const where: Prisma.OrdenTrabajoWhereInput = {};
  if (estado) where.estado = estado as Prisma.OrdenTrabajoWhereInput["estado"];
  if (tipo) where.tipo = tipo as Prisma.OrdenTrabajoWhereInput["tipo"];
  if (prioridad)
    where.prioridad = prioridad as Prisma.OrdenTrabajoWhereInput["prioridad"];

  const ordenes = await prisma.ordenTrabajo.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tareas: true, repuestos: true } },
    },
    take: 500,
  });

  // Manually join moto data (no relation in schema)
  const motoIds = [...new Set(ordenes.map((o) => o.motoId))];
  const motos = await prisma.moto.findMany({
    where: { id: { in: motoIds } },
    select: { id: true, patente: true, marca: true, modelo: true },
  });
  const motoMap = new Map(motos.map((m) => [m.id, m]));

  return ordenes.map((o) => ({
    ...o,
    moto: motoMap.get(o.motoId) ?? null,
  }));
}

async function getStats() {
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

  const [otActivas, otCompletadasMes, costoAgg, otConFechas] =
    await Promise.all([
      prisma.ordenTrabajo.count({
        where: { estado: { notIn: ["COMPLETADA", "CANCELADA"] } },
      }),
      prisma.ordenTrabajo.count({
        where: {
          estado: "COMPLETADA",
          fechaFinReal: { gte: inicioMes },
        },
      }),
      prisma.ordenTrabajo.aggregate({
        where: {
          estado: "COMPLETADA",
          fechaFinReal: { gte: inicioMes },
        },
        _sum: { costoTotal: true },
      }),
      prisma.ordenTrabajo.findMany({
        where: {
          estado: "COMPLETADA",
          fechaFinReal: { gte: inicioMes },
          fechaInicioReal: { not: null },
        },
        select: { fechaSolicitud: true, fechaFinReal: true },
      }),
    ]);

  let tiempoPromedio = 0;
  if (otConFechas.length > 0) {
    const totalDias = otConFechas.reduce((sum, ot) => {
      if (!ot.fechaFinReal) return sum;
      const diff =
        ot.fechaFinReal.getTime() - ot.fechaSolicitud.getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    tiempoPromedio = totalDias / otConFechas.length;
  }

  return {
    otActivas,
    otCompletadasMes,
    costoTotalMes: Number(costoAgg._sum.costoTotal ?? 0),
    tiempoPromedio,
  };
}

async function getMotos() {
  return prisma.moto.findMany({
    where: { estado: { notIn: ["BAJA_DEFINITIVA", "TRANSFERIDA"] } },
    select: { id: true, patente: true, marca: true, modelo: true },
    orderBy: { patente: "asc" },
  });
}

export default async function OrdenesTrabajoPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string;
    tipo?: string;
    prioridad?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const sp = await searchParams;

  const [ordenes, stats, motos] = await Promise.all([
    getOrdenes(sp.estado ?? null, sp.tipo ?? null, sp.prioridad ?? null),
    getStats(),
    getMotos(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Órdenes de Trabajo"
        description="Gestión de mantenimientos y reparaciones"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="OTs Activas"
          value={stats.otActivas}
          icon={Clock}
        />
        <KPICard
          label="Completadas (mes)"
          value={stats.otCompletadasMes}
          icon={CheckCircle2}
        />
        <KPICard
          label="Costo Total (mes)"
          value={formatMoney(stats.costoTotalMes)}
          icon={DollarSign}
        />
        <KPICard
          label="Tiempo Promedio"
          value={
            stats.tiempoPromedio > 0
              ? `${stats.tiempoPromedio.toFixed(1)} días`
              : "N/A"
          }
          icon={Timer}
        />
      </div>

      <OTTable data={ordenes} motos={motos} />
    </div>
  );
}
