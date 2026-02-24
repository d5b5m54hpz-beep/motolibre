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
    },
  });
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

  const [motos, stats] = await Promise.all([getMotos(), getStats()]);

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
        />
      </div>

      <MotosTable data={motos} marcas={stats.marcas} />
    </div>
  );
}
