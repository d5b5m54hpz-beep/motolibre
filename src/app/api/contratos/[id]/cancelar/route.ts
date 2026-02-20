import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { contratoCancelSchema } from "@/lib/validations/contrato";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.contract.cancel,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = contratoCancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: { moto: true },
  });
  if (!contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }
  if (contrato.estado !== "ACTIVO" && contrato.estado !== "BORRADOR") {
    return NextResponse.json(
      { error: `No se puede cancelar contrato en estado ${contrato.estado}` },
      { status: 422 }
    );
  }

  const updated = await withEvent(
    OPERATIONS.commercial.contract.cancel,
    "Contrato",
    () =>
      prisma.$transaction(async (tx) => {
        const c = await tx.contrato.update({
          where: { id },
          data: {
            estado: "CANCELADO",
            fechaCancelacion: new Date(),
            fechaFinReal: new Date(),
            motivoCancelacion: parsed.data.motivoCancelacion,
            penalidad: parsed.data.penalidad ?? undefined,
          },
        });

        await tx.cuota.updateMany({
          where: { contratoId: id, estado: { in: ["PENDIENTE", "VENCIDA"] } },
          data: { estado: "CANCELADA" },
        });

        const estadoAnteriorMoto = contrato.moto.estado;
        await tx.moto.update({
          where: { id: contrato.motoId },
          data: { estado: "DISPONIBLE", estadoAnterior: estadoAnteriorMoto },
        });

        await tx.historialEstadoMoto.create({
          data: {
            motoId: contrato.motoId,
            estadoAnterior: estadoAnteriorMoto,
            estadoNuevo: "DISPONIBLE",
            motivo: `Contrato ${id} cancelado: ${parsed.data.motivoCancelacion}`,
            userId,
          },
        });

        return c;
      }),
    userId,
    { motivo: parsed.data.motivoCancelacion }
  );

  return NextResponse.json({ data: updated });
}
