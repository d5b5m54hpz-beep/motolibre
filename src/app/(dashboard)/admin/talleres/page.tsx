import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { TalleresTable } from "./_components/talleres-table";
import { Building2, Users, Wrench, DollarSign } from "lucide-react";
import { formatMoney } from "@/lib/format";

async function getTalleres() {
  const talleres = await prisma.taller.findMany({
    include: {
      mecanicos: { where: { activo: true }, orderBy: { nombre: "asc" } },
      _count: { select: { mecanicos: true } },
    },
    orderBy: { nombre: "asc" },
  });

  // Get OT activas per taller
  const otActivas = await prisma.ordenTrabajo.groupBy({
    by: ["tallerId"],
    where: {
      tallerId: { not: null },
      estado: { in: ["SOLICITADA", "APROBADA", "PROGRAMADA", "EN_ESPERA_REPUESTOS", "EN_EJECUCION", "EN_REVISION"] },
    },
    _count: { id: true },
  });
  const otActivasMap = new Map(
    otActivas.map((o) => [o.tallerId!, o._count.id])
  );

  return talleres.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    tipo: t.tipo,
    direccion: t.direccion,
    telefono: t.telefono,
    email: t.email,
    contacto: t.contacto,
    especialidades: t.especialidades,
    activo: t.activo,
    notas: t.notas,
    tarifaHora: (t as Record<string, unknown>).tarifaHora as number | null ?? null,
    mecanicosCount: t._count.mecanicos,
    otActivas: otActivasMap.get(t.id) ?? 0,
    createdAt: t.createdAt.toISOString(),
  }));
}

async function getMecanicos() {
  const mecanicos = await prisma.mecanico.findMany({
    include: {
      taller: { select: { nombre: true } },
    },
    orderBy: { nombre: "asc" },
  });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get OT counts per mecanico
  const [otHoy, otMes] = await Promise.all([
    prisma.ordenTrabajo.groupBy({
      by: ["mecanicoId"],
      where: {
        mecanicoId: { not: null },
        estado: { in: ["EN_EJECUCION", "PROGRAMADA", "APROBADA"] },
        fechaProgramada: { gte: startOfDay },
      },
      _count: { id: true },
    }),
    prisma.ordenTrabajo.groupBy({
      by: ["mecanicoId"],
      where: {
        mecanicoId: { not: null },
        estado: "COMPLETADA",
        fechaFinReal: { gte: startOfMonth },
      },
      _count: { id: true },
    }),
  ]);

  const otHoyMap = new Map(otHoy.map((o) => [o.mecanicoId!, o._count.id]));
  const otMesMap = new Map(otMes.map((o) => [o.mecanicoId!, o._count.id]));

  return mecanicos.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    apellido: m.apellido,
    telefono: m.telefono,
    email: m.email,
    especialidad: m.especialidad,
    activo: m.activo,
    tallerId: m.tallerId,
    tallerNombre: m.taller.nombre,
    otHoy: otHoyMap.get(m.id) ?? 0,
    otMes: otMesMap.get(m.id) ?? 0,
  }));
}

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [talleresActivos, mecanicosActivos, otEsteMes, costoPromedioResult] =
    await Promise.all([
      prisma.taller.count({ where: { activo: true } }),
      prisma.mecanico.count({ where: { activo: true } }),
      prisma.ordenTrabajo.count({
        where: {
          tallerId: { not: null },
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.ordenTrabajo.aggregate({
        where: {
          estado: "COMPLETADA",
          tallerId: { not: null },
          fechaFinReal: { gte: startOfMonth },
        },
        _avg: { costoTotal: true },
      }),
    ]);

  return {
    talleresActivos,
    mecanicosActivos,
    otEsteMes,
    costoPromedioOT: costoPromedioResult._avg.costoTotal
      ? Number(costoPromedioResult._avg.costoTotal)
      : 0,
  };
}

export default async function TalleresPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [talleres, mecanicos, stats] = await Promise.all([
    getTalleres(),
    getMecanicos(),
    getStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Talleres y Mecánicos"
        description="Gestión de talleres internos/externos y equipo de mecánicos"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Talleres Activos"
          value={stats.talleresActivos}
          icon={Building2}
          description="talleres operativos"
        />
        <KPICard
          label="Mecánicos Activos"
          value={stats.mecanicosActivos}
          icon={Users}
          description="mecánicos disponibles"
        />
        <KPICard
          label="OT este Mes"
          value={stats.otEsteMes}
          icon={Wrench}
          description="órdenes en talleres"
        />
        <KPICard
          label="Costo Promedio OT"
          value={stats.costoPromedioOT > 0 ? formatMoney(stats.costoPromedioOT) : "—"}
          icon={DollarSign}
          description="promedio completadas"
        />
      </div>

      <TalleresTable talleres={talleres} mecanicos={mecanicos} />
    </div>
  );
}
