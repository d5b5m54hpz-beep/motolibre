import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { proximoNumeroOT } from "@/lib/ot-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.maintenance.workshop.create,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const mant = await prisma.mantenimientoProgramado.findUnique({ where: { id } });
  if (!mant) {
    return NextResponse.json({ error: "Mantenimiento no encontrado" }, { status: 404 });
  }
  if (mant.estado !== "PROGRAMADO" && mant.estado !== "NOTIFICADO") {
    return NextResponse.json(
      { error: `No se puede completar mantenimiento en estado ${mant.estado}` },
      { status: 422 }
    );
  }

  const updated = await prisma.mantenimientoProgramado.update({
    where: { id },
    data: {
      estado: "COMPLETADO",
      fechaRealizada: new Date(),
      notasOperador: body.notas ?? null,
    },
  });

  // Opción: generar OT automáticamente al completar
  let ot = null;
  if (body.generarOT) {
    const numero = await proximoNumeroOT();
    ot = await withEvent(
      OPERATIONS.maintenance.workOrder.create,
      "OrdenTrabajo",
      () =>
        prisma.ordenTrabajo.create({
          data: {
            numero,
            tipo: "PREVENTIVO",
            tipoService: "SERVICE_GENERAL",
            motoId: mant.motoId,
            contratoId: mant.contratoId,
            clienteId: mant.clienteId,
            descripcion: `Service programado #${mant.numero} — Mantenimiento completado`,
            mantenimientoProgramadoId: mant.id,
            solicitadoPor: userId,
            historial: {
              create: {
                estadoAnterior: "SOLICITADA",
                estadoNuevo: "SOLICITADA",
                descripcion: "OT generada desde mantenimiento programado",
                userId,
              },
            },
          },
        }),
      userId
    );
  }

  return NextResponse.json({ data: updated, ot });
}
