import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { PlanesTable } from "./_components/planes-table";
import { ClipboardList, CheckCircle, FileEdit, Bike } from "lucide-react";

async function getPlanes() {
  return prisma.planMantenimiento.findMany({
    include: {
      tareas: { orderBy: { orden: "asc" } },
      repuestos: true,
      _count: { select: { tareas: true, repuestos: true } },
    },
    orderBy: { nombre: "asc" },
  });
}

async function getStats() {
  const [total, byEstado, marcas] = await Promise.all([
    prisma.planMantenimiento.count(),
    prisma.planMantenimiento.groupBy({
      by: ["estado"],
      _count: { estado: true },
    }),
    prisma.planMantenimiento.findMany({
      select: { marcaMoto: true },
      distinct: ["marcaMoto"],
      where: { marcaMoto: { not: null } },
      orderBy: { marcaMoto: "asc" },
    }),
  ]);

  const estadoMap = Object.fromEntries(
    byEstado.map((e) => [e.estado, e._count.estado])
  );

  // Count distinct marca+modelo combinations
  const modelosCubiertos = await prisma.planMantenimiento.findMany({
    select: { marcaMoto: true, modeloMoto: true },
    distinct: ["marcaMoto", "modeloMoto"],
    where: { marcaMoto: { not: null } },
  });

  return {
    total,
    publicados: estadoMap["PUBLICADO"] ?? 0,
    borradores: estadoMap["BORRADOR"] ?? 0,
    modelosCubiertos: modelosCubiertos.length,
    marcas: marcas.map((m) => m.marcaMoto!).filter(Boolean),
  };
}

export default async function PlanesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [rawPlanes, stats] = await Promise.all([getPlanes(), getStats()]);

  // Transform planes for the table rows
  const tableData = rawPlanes.map((p) => {
    const plan = p as typeof p & {
      marcaMoto?: string | null;
      modeloMoto?: string | null;
      garantiaMeses?: number | null;
      garantiaKm?: number | null;
      estado?: string;
    };
    return {
      id: plan.id,
      nombre: plan.nombre,
      tipoService: plan.tipoService,
      descripcion: plan.descripcion,
      marcaMoto: plan.marcaMoto ?? null,
      modeloMoto: plan.modeloMoto ?? null,
      kmIntervalo: plan.kmIntervalo,
      diasIntervalo: plan.diasIntervalo,
      garantiaMeses: plan.garantiaMeses ?? null,
      garantiaKm: plan.garantiaKm ?? null,
      estado: plan.estado ?? (plan.activo ? "BORRADOR" : "ARCHIVADO"),
      activo: plan.activo,
      tareasCount: plan._count.tareas,
      repuestosCount: plan._count.repuestos,
      tiempoTotal: plan.tareas.reduce((sum, t) => {
        const tarea = t as typeof t & { tiempoEstimado?: number | null };
        return sum + (tarea.tiempoEstimado ?? 0);
      }, 0),
      costoRepuestos: plan.repuestos.reduce((sum, r) => {
        const rep = r as typeof r & { precioUnitario?: number | null };
        return sum + (rep.precioUnitario ?? 0) * r.cantidad;
      }, 0),
      createdAt: plan.createdAt.toISOString(),
    };
  });

  // Full plan details for sheet
  const planDetails = rawPlanes.map((p) => {
    const plan = p as typeof p & {
      marcaMoto?: string | null;
      modeloMoto?: string | null;
      garantiaMeses?: number | null;
      garantiaKm?: number | null;
      estado?: string;
    };
    return {
      id: plan.id,
      nombre: plan.nombre,
      tipoService: plan.tipoService,
      descripcion: plan.descripcion,
      marcaMoto: plan.marcaMoto ?? null,
      modeloMoto: plan.modeloMoto ?? null,
      kmIntervalo: plan.kmIntervalo,
      diasIntervalo: plan.diasIntervalo,
      garantiaMeses: plan.garantiaMeses ?? null,
      garantiaKm: plan.garantiaKm ?? null,
      estado: plan.estado ?? (plan.activo ? "BORRADOR" : "ARCHIVADO"),
      activo: plan.activo,
      tareas: plan.tareas.map((t) => {
        const tarea = t as typeof t & { accion?: string; tiempoEstimado?: number | null };
        return {
          id: tarea.id,
          categoria: tarea.categoria,
          descripcion: tarea.descripcion,
          accion: tarea.accion,
          orden: tarea.orden,
          tiempoEstimado: tarea.tiempoEstimado ?? null,
        };
      }),
      repuestos: plan.repuestos.map((r) => {
        const rep = r as typeof r & {
          codigoOEM?: string | null;
          unidad?: string | null;
          precioUnitario?: number | null;
        };
        return {
          id: rep.id,
          nombre: rep.nombre,
          codigoOEM: rep.codigoOEM ?? null,
          cantidad: rep.cantidad,
          unidad: rep.unidad ?? null,
          precioUnitario: rep.precioUnitario ?? null,
        };
      }),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planes de Mantenimiento"
        description="Definí los services estándar para cada modelo de moto"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Planes"
          value={stats.total}
          icon={ClipboardList}
          description="planes definidos"
        />
        <KPICard
          label="Publicados"
          value={stats.publicados}
          icon={CheckCircle}
          description="planes activos"
        />
        <KPICard
          label="Borradores"
          value={stats.borradores}
          icon={FileEdit}
          description="en edición"
        />
        <KPICard
          label="Modelos Cubiertos"
          value={stats.modelosCubiertos}
          icon={Bike}
          description="marca/modelo con plan"
        />
      </div>

      <PlanesTable
        data={tableData}
        planes={planDetails}
        marcas={stats.marcas}
      />
    </div>
  );
}
