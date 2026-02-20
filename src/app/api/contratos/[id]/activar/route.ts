import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { generarFechasCuotas } from "@/lib/contrato-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.contract.activate,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: { moto: true },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }
  if (contrato.estado !== "BORRADOR") {
    return NextResponse.json(
      { error: `Solo contratos en BORRADOR pueden activarse. Estado actual: ${contrato.estado}` },
      { status: 422 }
    );
  }

  const fechaInicio = new Date();
  const fechasCuotas = generarFechasCuotas(fechaInicio, contrato.duracionMeses, contrato.frecuenciaPago);
  const fechaFin = new Date(fechaInicio);
  fechaFin.setMonth(fechaFin.getMonth() + contrato.duracionMeses);

  const updated = await withEvent(
    OPERATIONS.commercial.contract.activate,
    "Contrato",
    () =>
      prisma.$transaction(async (tx) => {
        const c = await tx.contrato.update({
          where: { id },
          data: {
            estado: "ACTIVO",
            fechaInicio,
            fechaFin,
            fechaActivacion: new Date(),
          },
        });

        await tx.cuota.createMany({
          data: fechasCuotas.map((fecha, i) => ({
            contratoId: id,
            numero: i + 1,
            monto: contrato.montoPeriodo,
            fechaVencimiento: fecha,
          })),
        });

        const estadoAnteriorMoto = contrato.moto.estado;
        await tx.moto.update({
          where: { id: contrato.motoId },
          data: { estado: "ALQUILADA", estadoAnterior: estadoAnteriorMoto },
        });

        await tx.historialEstadoMoto.create({
          data: {
            motoId: contrato.motoId,
            estadoAnterior: estadoAnteriorMoto,
            estadoNuevo: "ALQUILADA",
            motivo: `Contrato ${id} activado`,
            userId,
          },
        });

        return c;
      }),
    userId,
    { motoId: contrato.motoId, cuotasGeneradas: fechasCuotas.length }
  );

  return NextResponse.json({ data: updated });
}
