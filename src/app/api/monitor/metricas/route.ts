import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(_req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.monitor.view,
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  try {
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // ── Totales de las ultimas 24h ──
    const [eventosTotal, eventosConError] = await Promise.all([
      prisma.eventoSistema.count({
        where: { createdAt: { gte: hace24h } },
      }),
      prisma.eventoSistema.count({
        where: {
          createdAt: { gte: hace24h },
          handlersFallidos: { gt: 0 },
        },
      }),
    ]);

    const tasaError =
      eventosTotal > 0
        ? Math.round((eventosConError / eventosTotal) * 10000) / 100
        : 0;

    // ── Tiempo promedio (raw query) ──
    const avgResult = await prisma.$queryRaw<[{ avg_ms: number | null }]>`
      SELECT AVG(duracion_ms) as avg_ms
      FROM eventos_sistema
      WHERE created_at >= ${hace24h}
        AND duracion_ms IS NOT NULL
    `;
    const tiempoPromedioMs = Math.round(Number(avgResult[0]?.avg_ms ?? 0));

    // ── Agrupado por modulo ──
    const porModuloRaw = await prisma.$queryRaw<
      Array<{
        modulo: string;
        total: bigint;
        errores: bigint;
        tiempo_promedio: number | null;
      }>
    >`
      SELECT
        origen_modulo as modulo,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE handlers_fallidos > 0) as errores,
        AVG(duracion_ms) as tiempo_promedio
      FROM eventos_sistema
      WHERE created_at >= ${hace24h}
      GROUP BY origen_modulo
      ORDER BY total DESC
    `;

    const porModulo = porModuloRaw.map((r) => ({
      modulo: r.modulo,
      total: Number(r.total),
      errores: Number(r.errores),
      tiempoPromedio: Math.round(Number(r.tiempo_promedio ?? 0)),
    }));

    // ── Agrupado por tipo (top 10) ──
    const porTipoRaw = await prisma.$queryRaw<
      Array<{ tipo: string; total: bigint; errores: bigint }>
    >`
      SELECT
        tipo,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE handlers_fallidos > 0) as errores
      FROM eventos_sistema
      WHERE created_at >= ${hace24h}
      GROUP BY tipo
      ORDER BY total DESC
      LIMIT 10
    `;

    const porTipo = porTipoRaw.map((r) => ({
      tipo: r.tipo,
      total: Number(r.total),
      errores: Number(r.errores),
    }));

    // ── Timeline por hora (ultimas 24h) ──
    const timelineRaw = await prisma.$queryRaw<
      Array<{ hora: Date; total: bigint; errores: bigint }>
    >`
      SELECT
        date_trunc('hour', created_at) as hora,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE handlers_fallidos > 0) as errores
      FROM eventos_sistema
      WHERE created_at >= ${hace24h}
      GROUP BY date_trunc('hour', created_at)
      ORDER BY hora ASC
    `;

    const timeline = timelineRaw.map((r) => ({
      hora: new Date(r.hora).toISOString(),
      total: Number(r.total),
      errores: Number(r.errores),
    }));

    return NextResponse.json({
      data: {
        eventosTotal,
        eventosConError,
        tasaError,
        tiempoPromedioMs,
        porModulo,
        porTipo,
        timeline,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching metricas:", error);
    return NextResponse.json(
      { error: "Error al obtener metricas del sistema" },
      { status: 500 }
    );
  }
}
