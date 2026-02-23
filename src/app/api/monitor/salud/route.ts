import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { readFile } from "fs/promises";

export async function GET(_req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.monitor.view,
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  try {
    const hace1h = new Date(Date.now() - 60 * 60 * 1000);

    // ── Check: Database latency ──
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - dbStart;

    // ── Check: Event Bus (eventos en la ultima hora) ──
    const eventosUltimaHora = await prisma.eventoSistema.count({
      where: { createdAt: { gte: hace1h } },
    });

    // ── Check: Errores recientes ──
    const erroresRecientes = await prisma.eventoSistema.count({
      where: {
        createdAt: { gte: hace1h },
        nivel: { in: ["ERROR", "CRITICAL"] },
      },
    });

    // ── Determinar estado general ──
    let estado: "SALUDABLE" | "DEGRADADO" | "CRITICO";
    if (dbLatencyMs > 5000 || erroresRecientes > 10) {
      estado = "CRITICO";
    } else if (dbLatencyMs > 1000 || erroresRecientes > 3) {
      estado = "DEGRADADO";
    } else {
      estado = "SALUDABLE";
    }

    // ── Version del sistema ──
    let version = "unknown";
    try {
      const pkgPath = process.cwd() + "/package.json";
      const pkgContent = await readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(pkgContent);
      version = pkg.version ?? "unknown";
    } catch {
      // Si no se puede leer package.json, dejamos "unknown"
    }

    // ── Uptime ──
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptime = `${hours}h ${minutes}m ${seconds}s`;

    return NextResponse.json({
      data: {
        estado,
        checks: {
          database: {
            ok: dbLatencyMs <= 5000,
            latencyMs: dbLatencyMs,
          },
          eventBus: {
            ok: eventosUltimaHora > 0,
            eventosUltimaHora,
          },
          erroresRecientes: {
            ok: erroresRecientes <= 3,
            count: erroresRecientes,
          },
        },
        uptime,
        version,
      },
    });
  } catch (error: unknown) {
    console.error("Error en health check:", error);
    return NextResponse.json(
      { error: "Error al verificar salud del sistema" },
      { status: 500 }
    );
  }
}
