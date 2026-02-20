import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.contract.finalize,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: { moto: true, cuotas: true },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }
  if (contrato.estado !== "ACTIVO") {
    return NextResponse.json({ error: "Solo contratos ACTIVOS pueden finalizarse" }, { status: 422 });
  }

  const cuotasPendientes = contrato.cuotas.filter(
    (c) => c.estado === "PENDIENTE" || c.estado === "VENCIDA"
  );
  if (cuotasPendientes.length > 0) {
    return NextResponse.json(
      {
        error: `Hay ${cuotasPendientes.length} cuota(s) pendientes/vencidas. Resolver antes de finalizar.`,
        cuotasPendientes: cuotasPendientes.length,
      },
      { status: 422 }
    );
  }

  const updated = await withEvent(
    OPERATIONS.commercial.contract.finalize,
    "Contrato",
    () =>
      prisma.$transaction(async (tx) => {
        const c = await tx.contrato.update({
          where: { id },
          data: { estado: "FINALIZADO", fechaFinReal: new Date() },
        });

        const estadoAnterior = contrato.moto.estado;
        await tx.moto.update({
          where: { id: contrato.motoId },
          data: { estado: "DISPONIBLE", estadoAnterior: estadoAnterior },
        });

        await tx.historialEstadoMoto.create({
          data: {
            motoId: contrato.motoId,
            estadoAnterior: estadoAnterior,
            estadoNuevo: "DISPONIBLE",
            motivo: `Contrato ${id} finalizado`,
            userId,
          },
        });

        return c;
      }),
    userId
  );

  return NextResponse.json({ data: updated });
}
