import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { eventBus } from "@/lib/events/event-bus";
import { prisma } from "@/lib/prisma";
import { validarTransicionOT } from "@/lib/ot-utils";
import { apiSetup } from "@/lib/api-helpers";
import type { EstadoOT } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const nuevoEstado = body.estado as EstadoOT;

  if (!nuevoEstado) {
    return NextResponse.json({ error: "Estado requerido" }, { status: 400 });
  }

  const ot = await prisma.ordenTrabajo.findUnique({ where: { id } });
  if (!ot) {
    return NextResponse.json({ error: "OT no encontrada" }, { status: 404 });
  }

  if (!validarTransicionOT(ot.estado, nuevoEstado)) {
    return NextResponse.json(
      { error: `Transición no válida: ${ot.estado} → ${nuevoEstado}` },
      { status: 400 }
    );
  }

  // Validaciones especiales por transición
  if (nuevoEstado === "CANCELADA" && !body.motivoCancelacion) {
    return NextResponse.json(
      { error: "Motivo de cancelación requerido" },
      { status: 400 }
    );
  }

  if (nuevoEstado === "EN_EJECUCION" && ot.estado === "PROGRAMADA" && !body.kmIngreso && !ot.kmIngreso) {
    return NextResponse.json(
      { error: "Km de ingreso requerido para check-in" },
      { status: 400 }
    );
  }

  // Construir data de actualización
  const updateData: Record<string, unknown> = {
    estado: nuevoEstado,
  };

  switch (nuevoEstado) {
    case "APROBADA":
      updateData.fechaAprobacion = new Date();
      break;
    case "PROGRAMADA":
      if (body.fechaProgramada) updateData.fechaProgramada = new Date(body.fechaProgramada);
      if (body.tallerNombre) updateData.tallerNombre = body.tallerNombre;
      if (body.mecanicoNombre) updateData.mecanicoNombre = body.mecanicoNombre;
      break;
    case "EN_EJECUCION":
      if (body.kmIngreso) {
        updateData.kmIngreso = body.kmIngreso;
        updateData.fechaCheckIn = new Date();
      }
      if (!ot.fechaInicioReal) {
        updateData.fechaInicioReal = new Date();
      }
      break;
    case "COMPLETADA": {
      updateData.fechaFinReal = new Date();
      updateData.fechaCheckOut = new Date();
      if (body.kmEgreso) updateData.kmEgreso = body.kmEgreso;
      if (body.observaciones) updateData.observaciones = body.observaciones;
      if (body.costoManoObra !== undefined) updateData.costoManoObra = body.costoManoObra;

      // Calcular costo total
      const repuestos = await prisma.repuestoOrdenTrabajo.aggregate({
        where: { ordenTrabajoId: id },
        _sum: { subtotal: true },
      });
      const costoRepuestos = Number(repuestos._sum.subtotal ?? 0);
      const costoManoObra = body.costoManoObra !== undefined ? Number(body.costoManoObra) : Number(ot.costoManoObra ?? 0);
      updateData.costoRepuestos = costoRepuestos;
      updateData.costoTotal = costoManoObra + costoRepuestos;
      break;
    }
    case "CANCELADA":
      updateData.motivoCancelacion = body.motivoCancelacion;
      break;
  }

  const updated = await prisma.ordenTrabajo.update({
    where: { id },
    data: updateData,
  });

  // Registrar historial
  await prisma.historialOT.create({
    data: {
      ordenTrabajoId: id,
      estadoAnterior: ot.estado,
      estadoNuevo: nuevoEstado,
      descripcion: body.descripcion || body.motivoCancelacion || `Cambio a ${nuevoEstado}`,
      userId,
    },
  });

  // Emitir eventos según transición
  if (nuevoEstado === "COMPLETADA") {
    await eventBus
      .emit(
        OPERATIONS.maintenance.workOrder.complete,
        "OrdenTrabajo",
        id,
        { costoTotal: Number(updated.costoTotal ?? 0), motoId: updated.motoId },
        userId
      )
      .catch((e: unknown) => console.error("[OT] Error emitiendo evento complete:", e));
  } else if (nuevoEstado === "CANCELADA") {
    await eventBus
      .emit(OPERATIONS.maintenance.workOrder.cancel, "OrdenTrabajo", id, undefined, userId)
      .catch((e: unknown) => console.error("[OT] Error emitiendo evento cancel:", e));
  } else if (nuevoEstado === "APROBADA") {
    await eventBus
      .emit(OPERATIONS.maintenance.workOrder.approve, "OrdenTrabajo", id, undefined, userId)
      .catch((e: unknown) => console.error("[OT] Error emitiendo evento approve:", e));
  } else if (nuevoEstado === "EN_EJECUCION") {
    await eventBus
      .emit(OPERATIONS.maintenance.workOrder.start, "OrdenTrabajo", id, undefined, userId)
      .catch((e: unknown) => console.error("[OT] Error emitiendo evento start:", e));
  }

  return NextResponse.json({ data: updated });
}
