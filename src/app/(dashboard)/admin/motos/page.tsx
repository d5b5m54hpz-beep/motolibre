import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { MotosTable } from "./_components/motos-table";
import { Bike, CheckCircle, Users, Wrench } from "lucide-react";

async function getMotos() {
  return prisma.moto.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { documentos: true, historialEstados: true } },
      contratos: {
        where: { estado: "ACTIVO" },
        take: 1,
        include: { cliente: { select: { nombre: true, apellido: true } } },
      },
      mantenimientos: {
        where: { estado: { in: ["COMPLETADO"] } },
        orderBy: { fechaRealizada: "desc" },
        take: 1,
        select: { fechaRealizada: true },
      },
    },
  });
}

async function getProxService(motoIds: string[]) {
  if (motoIds.length === 0) return new Map<string, Date>();
  const rows = await prisma.mantenimientoProgramado.findMany({
    where: {
      motoId: { in: motoIds },
      estado: { in: ["PROGRAMADO", "NOTIFICADO"] },
    },
    orderBy: { fechaProgramada: "asc" },
    distinct: ["motoId"],
    select: { motoId: true, fechaProgramada: true },
  });
  return new Map(rows.map((r) => [r.motoId, r.fechaProgramada]));
}

async function getStats() {
  const [total, byEstado, marcas] = await Promise.all([
    prisma.moto.count(),
    prisma.moto.groupBy({
      by: ["estado"],
      _count: { estado: true },
    }),
    prisma.moto.findMany({
      select: { marca: true },
      distinct: ["marca"],
      orderBy: { marca: "asc" },
    }),
  ]);

  const estadoMap = Object.fromEntries(
    byEstado.map((e) => [e.estado, e._count.estado])
  );

  return {
    total,
    disponibles: estadoMap["DISPONIBLE"] ?? 0,
    alquiladas: estadoMap["ALQUILADA"] ?? 0,
    enService: (estadoMap["EN_SERVICE"] ?? 0) + (estadoMap["EN_REPARACION"] ?? 0),
    marcas: marcas.map((m) => m.marca),
  };
}

export default async function MotosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [rawMotos, stats] = await Promise.all([getMotos(), getStats()]);

  // Fetch next scheduled service for all motos
  const proxServiceMap = await getProxService(rawMotos.map((m) => m.id));

  // Enrich motos with renter, last service, next service
  const motos = rawMotos.map((m) => {
    const activeContrato = m.contratos[0];
    const renterName = activeContrato
      ? `${activeContrato.cliente.nombre} ${activeContrato.cliente.apellido}`
      : null;
    const ultService = m.mantenimientos[0]?.fechaRealizada ?? null;
    const proxService = proxServiceMap.get(m.id) ?? null;

    // Remove the included relations to keep the MotoRow type clean
    const { contratos, mantenimientos, ...motoData } = m;

    return {
      ...motoData,
      renterName,
      ultService: ultService?.toISOString() ?? null,
      proxService: proxService?.toISOString() ?? null,
    };
  });

  const utilizacion = stats.total > 0
    ? Math.round((stats.alquiladas / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Motos"
        description={`${stats.total} motos en flota`}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Flota Total"
          value={stats.total}
          icon={Bike}
          description="motos registradas"
        />
        <KPICard
          label="Disponibles"
          value={stats.disponibles}
          icon={CheckCircle}
          description={`${stats.total > 0 ? Math.round((stats.disponibles / stats.total) * 100) : 0}% de la flota`}
        />
        <KPICard
          label="Alquiladas"
          value={stats.alquiladas}
          icon={Users}
          description={`${utilizacion}% utilización`}
        />
        <KPICard
          label="En Service"
          value={stats.enService}
          icon={Wrench}
          description="en mantenimiento"
        />
      </div>

      <MotosTable data={motos} marcas={stats.marcas} />
    </div>
  );
}
