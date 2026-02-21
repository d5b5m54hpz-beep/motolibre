import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.accounting.period.close,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;

  const periodo = await prisma.periodoContable.findUnique({ where: { id } });
  if (!periodo) {
    return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
  }
  if (periodo.cerrado) {
    return NextResponse.json({ error: "El período ya está cerrado" }, { status: 400 });
  }

  const updated = await withEvent(
    OPERATIONS.accounting.period.close,
    "PeriodoContable",
    () =>
      prisma.periodoContable.update({
        where: { id },
        data: {
          cerrado: true,
          fechaCierre: new Date(),
          cerradoPor: userId,
        },
      }),
    userId
  );

  return NextResponse.json({ data: updated });
}
