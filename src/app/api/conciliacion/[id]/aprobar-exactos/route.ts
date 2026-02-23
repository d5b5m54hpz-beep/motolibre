import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.match,
    "canApprove",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  try {
    // Buscar todos los matches PROPUESTO con confianza >= 90
    const matches = await prisma.conciliacionMatch.findMany({
      where: {
        conciliacionId: id,
        estado: "PROPUESTO",
        confianza: { gte: 90 },
      },
    });

    if (matches.length === 0) {
      return NextResponse.json({ data: { aprobados: 0 } });
    }

    await prisma.$transaction(async (tx) => {
      for (const match of matches) {
        await tx.conciliacionMatch.update({
          where: { id: match.id },
          data: {
            estado: "APROBADO",
            aprobadoPor: session?.user?.id,
            fechaAprobacion: new Date(),
          },
        });

        await tx.extractoBancario.update({
          where: { id: match.extractoId },
          data: {
            conciliado: true,
            conciliacionMatchId: match.id,
          },
        });
      }

      await tx.conciliacion.update({
        where: { id },
        data: {
          totalConciliados: { increment: matches.length },
          totalNoConciliados: { decrement: matches.length },
        },
      });
    });

    return NextResponse.json({ data: { aprobados: matches.length } });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Error al aprobar matches exactos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
