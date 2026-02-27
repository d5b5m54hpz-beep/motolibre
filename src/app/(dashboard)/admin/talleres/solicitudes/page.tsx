import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { KPICard } from "@/components/ui/kpi-card";
import { ClipboardList, CheckCircle2, Clock, Star, Zap } from "lucide-react";
import { SolicitudesTable } from "./_components/solicitudes-table";
import { calcularPreScore } from "@/lib/taller-prescore";

async function getSolicitudes() {
  const solicitudes = await prisma.solicitudTaller.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { evaluaciones: true } },
    },
  });

  return solicitudes.map((s) => ({
    ...s,
    preScore: calcularPreScore({
      docCuit: s.docCuit,
      docHabilitacion: s.docHabilitacion,
      docSeguro: s.docSeguro,
      cantidadMecanicos: s.cantidadMecanicos,
      superficieM2: s.superficieM2,
      cantidadElevadores: s.cantidadElevadores,
      docFotos: s.docFotos,
      tieneDeposito: s.tieneDeposito,
      tieneEstacionamiento: s.tieneEstacionamiento,
    }),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <KPICard
          label="Pre-Score Promedio"
          value={(() => {
            const scores = solicitudes.map((s) => s.preScore).filter((ps): ps is number => ps != null);
            if (scores.length === 0) return "—";
            return `${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}/10`;
          })()}
          icon={Zap}
          description="Scoring automático"
        />
      </div>

      <SolicitudesTable solicitudes={solicitudes} />
    </div>
  );
}
