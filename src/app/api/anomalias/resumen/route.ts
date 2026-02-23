import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.anomaly.detect,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [
    total,
    nuevas,
    enRevision,
    resueltasMes,
    descartadasMes,
    porTipo,
    porSeveridad,
    ultimoAnalisis,
  ] = await Promise.all([
    prisma.anomalia.count({ where: { estado: { in: ["NUEVA", "EN_REVISION"] } } }),
    prisma.anomalia.count({ where: { estado: "NUEVA" } }),
    prisma.anomalia.count({ where: { estado: "EN_REVISION" } }),
    prisma.anomalia.count({ where: { estado: "RESUELTA", fechaResolucion: { gte: inicioMes } } }),
    prisma.anomalia.count({ where: { estado: "DESCARTADA", fechaResolucion: { gte: inicioMes } } }),
    prisma.anomalia.groupBy({
      by: ["tipo"],
      where: { estado: { in: ["NUEVA", "EN_REVISION"] } },
      _count: true,
    }),
    prisma.anomalia.groupBy({
      by: ["severidad"],
      where: { estado: { in: ["NUEVA", "EN_REVISION"] } },
      _count: true,
    }),
    prisma.analisisFinanciero.findFirst({
      where: { tipo: "ANOMALIAS_BATCH" },
      orderBy: { fechaEjecucion: "desc" },
    }),
  ]);

  return NextResponse.json({
    data: {
      total,
      nuevas,
      enRevision,
      resueltasMes,
      descartadasMes,
      porTipo: porTipo.map((t) => ({ tipo: t.tipo, count: t._count })),
      porSeveridad: porSeveridad.map((s) => ({ severidad: s.severidad, count: s._count })),
      ultimoAnalisis: ultimoAnalisis
        ? {
            fecha: ultimoAnalisis.fechaEjecucion,
            anomaliasDetectadas: ultimoAnalisis.anomaliasDetectadas,
            duracionMs: ultimoAnalisis.duracionMs,
          }
        : null,
    },
  });
}
