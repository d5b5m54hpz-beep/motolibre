import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { contratoCompraSchema } from "@/lib/validations/contrato";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.contract.finalizePurchase,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = contratoCompraSchema.safeParse(body);
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
  if (contrato.estado !== "ACTIVO") {
    return NextResponse.json({ error: "Solo contratos ACTIVOS permiten ejercer opción de compra" }, { status: 422 });
  }
  if (!contrato.tieneOpcionCompra) {
    return NextResponse.json({ error: "Este contrato no tiene opción de compra" }, { status: 422 });
  }

  const updated = await withEvent(
    OPERATIONS.commercial.contract.finalizePurchase,
    "Contrato",
    () =>
      prisma.$transaction(async (tx) => {
        const c = await tx.contrato.update({
          where: { id },
          data: {
            estado: "FINALIZADO_COMPRA",
            fechaFinReal: new Date(),
            fechaEjercicio: new Date(),
            precioCompra: parsed.data.precioCompra,
          },
        });

        await tx.cuota.updateMany({
          where: { contratoId: id, estado: "PENDIENTE" },
          data: { estado: "CANCELADA" },
        });

        const estadoAnterior = contrato.moto.estado;
        await tx.moto.update({
          where: { id: contrato.motoId },
          data: { estado: "TRANSFERIDA", estadoAnterior: estadoAnterior },
        });

        await tx.historialEstadoMoto.create({
          data: {
            motoId: contrato.motoId,
            estadoAnterior: estadoAnterior,
            estadoNuevo: "TRANSFERIDA",
            motivo: `Cliente ejerció opción de compra (contrato ${id}) — $${parsed.data.precioCompra}`,
            userId,
          },
        });

        return c;
      }),
    userId,
    { precioCompra: parsed.data.precioCompra }
  );

  return NextResponse.json({ data: updated });
}
