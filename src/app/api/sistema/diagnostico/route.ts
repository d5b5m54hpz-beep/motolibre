import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { ejecutarDiagnosticoCompleto } from "@/lib/diagnostico";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.system.diagnostico.execute,
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const limit = parseInt(sp.get("limit") || "20");

  const [data, total] = await Promise.all([
    prisma.diagnosticoEjecucion.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.diagnosticoEjecucion.count(),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(_req: NextRequest) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.system.diagnostico.execute,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  // Create the execution record in EN_EJECUCION state
  const ejecucion = await prisma.diagnosticoEjecucion.create({
    data: {
      estado: "EN_EJECUCION",
      ejecutadoPor: session?.user?.id ?? null,
    },
  });

  try {
    const start = Date.now();
    const resultados = await ejecutarDiagnosticoCompleto();
    const duracionMs = Date.now() - start;

    const checksOk = resultados.filter((r) => r.estado === "OK").length;
    const checksWarning = resultados.filter((r) => r.estado === "WARNING").length;
    const checksError = resultados.filter((r) => r.estado === "ERROR").length;

    const updated = await prisma.diagnosticoEjecucion.update({
      where: { id: ejecucion.id },
      data: {
        estado: "COMPLETADO",
        checksTotal: resultados.length,
        checksOk,
        checksWarning,
        checksError,
        resultados: resultados as unknown as Prisma.InputJsonValue,
        duracionMs,
        ejecutadoPor: session?.user?.id ?? null,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    // Mark execution as ERROR on failure
    await prisma.diagnosticoEjecucion.update({
      where: { id: ejecucion.id },
      data: {
        estado: "ERROR",
      },
    });

    const message =
      err instanceof Error ? err.message : "Error desconocido al ejecutar diagnóstico";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
