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
    OPERATIONS.finance.bankReconciliation.approve,
    "canApprove",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  try {
    const conciliacion = await prisma.conciliacion.findUnique({
      where: { id },
    });

    if (!conciliacion) {
      return NextResponse.json(
        { error: "Conciliacion no encontrada" },
        { status: 404 }
      );
    }

    if (conciliacion.estado !== "EN_PROCESO") {
      return NextResponse.json(
        { error: `No se puede completar una conciliacion en estado ${conciliacion.estado}` },
        { status: 422 }
      );
    }

    // Verificar que no haya matches pendientes de revision
    const pendientes = await prisma.conciliacionMatch.count({
      where: { conciliacionId: id, estado: "PROPUESTO" },
    });

    if (pendientes > 0) {
      return NextResponse.json(
        { error: "Hay matches pendientes de revision" },
        { status: 400 }
      );
    }

    // Calcular diferencia: suma de montos de extractos no conciliados
    const extractosNoConciliados = await prisma.extractoBancario.findMany({
      where: {
        cuentaBancariaId: conciliacion.cuentaBancariaId,
        fecha: {
          gte: conciliacion.periodoDesde,
          lte: conciliacion.periodoHasta,
        },
        conciliado: false,
      },
      select: { monto: true },
    });

    const diferencia = extractosNoConciliados.reduce(
      (acc, e) => acc + Number(e.monto),
      0
    );

    const updated = await prisma.conciliacion.update({
      where: { id },
      data: {
        estado: "COMPLETADA",
        diferencia,
        fechaCompletada: new Date(),
        completadaPor: session?.user?.id,
      },
    });

    // Si hay diferencia significativa, emitir evento para handler contable
    if (Math.abs(diferencia) > 0.01) {
      const { eventBus } = await import("@/lib/events/event-bus");
      await eventBus
        .emit(
          OPERATIONS.finance.bankReconciliation.approve,
          "Conciliacion",
          id,
          { diferencia },
          session?.user?.id
        )
        .catch((err: unknown) =>
          console.error(
            "[Conciliacion] Error emitiendo evento contable:",
            err
          )
        );
    }

    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al completar conciliacion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
