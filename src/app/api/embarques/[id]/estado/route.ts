import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, eventBus } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { TRANSICIONES_EMBARQUE } from "@/lib/importacion-utils";
import type { EstadoEmbarque } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.supply.shipment.changeState,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const embarque = await prisma.embarqueImportacion.findUnique({ where: { id } });
  if (!embarque) {
    return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const nuevoEstado = body.estado as EstadoEmbarque;

  const transicionesValidas = TRANSICIONES_EMBARQUE[embarque.estado] || [];
  if (!transicionesValidas.includes(nuevoEstado)) {
    return NextResponse.json(
      { error: `Transición inválida: ${embarque.estado} → ${nuevoEstado}` },
      { status: 400 }
    );
  }

  // Campos de fecha según estado
  const fechas: Record<string, unknown> = {};
  const now = new Date();
  if (nuevoEstado === "EN_TRANSITO" && !embarque.fechaEmbarque) fechas.fechaEmbarque = now;
  if (nuevoEstado === "EN_PUERTO") fechas.fechaArriboPuerto = now;
  if (nuevoEstado === "EN_ADUANA") fechas.fechaIngresoAduana = now;
  if (nuevoEstado === "EN_RECEPCION") fechas.fechaRecepcion = now;

  const updated = await prisma.embarqueImportacion.update({
    where: { id },
    data: { estado: nuevoEstado, ...fechas },
  });

  await eventBus.emit(
    OPERATIONS.supply.shipment.changeState,
    "EmbarqueImportacion",
    id,
    { estadoAnterior: embarque.estado, estadoNuevo: nuevoEstado },
    userId
  );

  return NextResponse.json(updated);
}
