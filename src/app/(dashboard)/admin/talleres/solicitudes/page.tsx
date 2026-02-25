import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { ClipboardList, CheckCircle2, Clock, Star } from "lucide-react";
import { SolicitudesTable } from "./_components/solicitudes-table";

async function getSolicitudes() {
  const solicitudes = await prisma.solicitudTaller.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { evaluaciones: true } },
    },
  });

  return solicitudes.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    fechaRecepcion: s.fechaRecepcion?.toISOString() ?? null,
    fechaAprobacion: s.fechaAprobacion?.toISOString() ?? null,
    fechaEvaluacion: s.fechaEvaluacion?.toISOString() ?? null,
  }));
}

async function getStats() {
  const [total, enPipeline, aprobadas, scorePromedio] = await Promise.all([
    prisma.solicitudTaller.count(),
    prisma.solicitudTaller.count({
      where: {
        estado: {
          in: ["RECIBIDA", "EN_EVALUACION", "EN_ESPERA", "INCOMPLETA"],
        },
      },
    }),
    prisma.solicitudTaller.count({
      where: {
        estado: { in: ["APROBADA", "CONVENIO_ENVIADO", "CONVENIO_FIRMADO", "ONBOARDING", "ACTIVO"] },
      },
    }),
    prisma.solicitudTaller.aggregate({
      where: { scoreTotal: { not: null } },
      _avg: { scoreTotal: true },
    }),
  ]);

  return {
    total,
    enPipeline,
    aprobadas,
    scorePromedio: scorePromedio._avg.scoreTotal ?? 0,
  };
}

export default async function SolicitudesTallerPage() {
  const session = await auth();
  if (!session?.user) redirect("/login-admin");

  const [solicitudes, stats] = await Promise.all([
    getSolicitudes(),
    getStats(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de Talleres"
        description="Pipeline de postulaciones para la red de talleres MotoLibre"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Solicitudes"
          value={stats.total}
          icon={ClipboardList}
        />
        <KPICard
          label="En Pipeline"
          value={stats.enPipeline}
          icon={Clock}
          description="Pendientes de resolución"
        />
        <KPICard
          label="Aprobadas"
          value={stats.aprobadas}
          icon={CheckCircle2}
        />
        <KPICard
          label="Score Promedio"
          value={stats.scorePromedio ? `${stats.scorePromedio.toFixed(1)}/10` : "—"}
          icon={Star}
        />
      </div>

      <SolicitudesTable solicitudes={solicitudes} />
    </div>
  );
}
