import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { eventBus } from "@/lib/events/event-bus";
import { prisma } from "@/lib/prisma";
import { CUENTAS } from "@/lib/contabilidad-utils";

export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.accounting.entry.create,
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  // 1. Verificar que todas las cuentas de CUENTAS existen
  const cuentasRequeridas = Object.entries(CUENTAS);
  const faltantes: string[] = [];

  for (const [nombre, codigo] of cuentasRequeridas) {
    const cuenta = await prisma.cuentaContable.findUnique({
      where: { codigo },
    });
    if (!cuenta) faltantes.push(`${nombre}: ${codigo}`);
    else if (!cuenta.aceptaMovimientos)
      faltantes.push(`${nombre}: ${codigo} (no acepta movimientos!)`);
  }

  // 2. Contar asientos por tipo
  const asientosPorTipo = await prisma.asientoContable.groupBy({
    by: ["tipo"],
    _count: true,
  });

  // 3. Último asiento
  const ultimoAsiento = await prisma.asientoContable.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      lineas: {
        include: {
          cuenta: { select: { codigo: true, nombre: true } },
        },
      },
    },
  });

  // 4. Handlers registrados
  const handlers = eventBus.getHandlers().map((h) => ({
    name: h.name,
    priority: h.priority,
    pattern: h.pattern,
  }));

  // 5. Total de asientos y períodos
  const totalAsientos = await prisma.asientoContable.count();
  const totalPeriodos = await prisma.periodoContable.count();

  return NextResponse.json({
    data: {
      cuentasRequeridas: cuentasRequeridas.length,
      cuentasFaltantes: faltantes,
      todoCorrecto: faltantes.length === 0,
      asientosPorTipo,
      totalAsientos,
      totalPeriodos,
      handlersRegistrados: handlers.length,
      handlers,
      ultimoAsiento,
    },
  });
}
