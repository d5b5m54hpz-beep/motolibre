import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.import,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const conciliacion = await prisma.conciliacion.findUnique({
    where: { id },
    include: {
      matches: {
        orderBy: { confianza: "desc" },
      },
      cuentaBancaria: {
        select: { id: true, nombre: true, banco: true },
      },
    },
  });

  if (!conciliacion) {
    return NextResponse.json(
      { error: "Conciliacion no encontrada" },
      { status: 404 }
    );
  }

  // Obtener extractos del período
  const extractos = await prisma.extractoBancario.findMany({
    where: {
      cuentaBancariaId: conciliacion.cuentaBancariaId,
      fecha: {
        gte: conciliacion.periodoDesde,
        lte: conciliacion.periodoHasta,
      },
    },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json({
    data: {
      ...conciliacion,
      extractos,
    },
  });
}
