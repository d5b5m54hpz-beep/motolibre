import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.match,
    "canApprove",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id, matchId } = await params;

  try {
    const match = await prisma.conciliacionMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match no encontrado" },
        { status: 404 }
      );
    }

    if (match.conciliacionId !== id) {
      return NextResponse.json(
        { error: "El match no pertenece a esta conciliacion" },
        { status: 400 }
      );
    }

    if (match.estado !== "PROPUESTO") {
      return NextResponse.json(
        { error: `No se puede aprobar un match en estado ${match.estado}` },
        { status: 422 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedMatch = await tx.conciliacionMatch.update({
        where: { id: matchId },
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

      await tx.conciliacion.update({
        where: { id },
        data: {
          totalConciliados: { increment: 1 },
          totalNoConciliados: { decrement: 1 },
        },
      });

      return updatedMatch;
    });

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al aprobar match";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
