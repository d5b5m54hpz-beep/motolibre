import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
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
  const body = await req.json();

  if (!body.confirmar) {
    return NextResponse.json(
      { error: "Debe enviar { confirmar: true } para reabrir el período" },
      { status: 400 }
    );
  }

  const periodo = await prisma.periodoContable.findUnique({ where: { id } });
  if (!periodo) {
    return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
  }
  if (!periodo.cerrado) {
    return NextResponse.json({ error: "El período ya está abierto" }, { status: 400 });
  }

  // Solo se puede reabrir el período cerrado más reciente
  const masRecienteCerrado = await prisma.periodoContable.findFirst({
    where: { cerrado: true },
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
  });

  if (!masRecienteCerrado || masRecienteCerrado.id !== id) {
    return NextResponse.json(
      { error: "Solo se puede reabrir el período cerrado más reciente" },
      { status: 400 }
    );
  }

  const updated = await withEvent(
    OPERATIONS.accounting.period.open,
    "PeriodoContable",
    () =>
      prisma.periodoContable.update({
        where: { id },
        data: {
          cerrado: false,
          fechaCierre: null,
          cerradoPor: null,
        },
      }),
    userId
  );

  return NextResponse.json({ data: updated });
}
