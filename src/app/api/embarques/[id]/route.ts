import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, eventBus } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.shipment.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const embarque = await prisma.embarqueImportacion.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      despachos: { orderBy: { createdAt: "desc" } },
      costosAsignados: true,
    },
  });

  if (!embarque) {
    return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
  }

  return NextResponse.json(embarque);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.supply.shipment.update,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const embarque = await prisma.embarqueImportacion.findUnique({ where: { id } });
  if (!embarque) {
    return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
  }
  if (embarque.estado !== "BORRADOR") {
    return NextResponse.json(
      { error: "Solo se puede editar un embarque en estado BORRADOR" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const updated = await prisma.embarqueImportacion.update({
    where: { id },
    data: {
      puertoOrigen: body.puertoOrigen,
      naviera: body.naviera,
      numeroContenedor: body.numeroContenedor,
      numeroBL: body.numeroBL,
      tipoTransporte: body.tipoTransporte,
      fechaEmbarque: body.fechaEmbarque ? new Date(body.fechaEmbarque) : undefined,
      fechaEstimadaArribo: body.fechaEstimadaArribo ? new Date(body.fechaEstimadaArribo) : undefined,
      observaciones: body.observaciones,
    },
    include: { items: true },
  });

  await eventBus.emit(
    OPERATIONS.supply.shipment.update,
    "EmbarqueImportacion",
    id,
    { estado: updated.estado },
    userId
  );

  return NextResponse.json(updated);
}
