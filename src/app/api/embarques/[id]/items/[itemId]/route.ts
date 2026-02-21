import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.shipment.update,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id, itemId } = await params;
  const embarque = await prisma.embarqueImportacion.findUnique({ where: { id } });
  if (!embarque || embarque.estado !== "BORRADOR") {
    return NextResponse.json(
      { error: "Solo se puede editar items en estado BORRADOR" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const subtotalFOB = (body.precioFOBUnitario ?? 0) * (body.cantidad ?? 0);

  const item = await prisma.itemEmbarque.update({
    where: { id: itemId },
    data: {
      descripcion: body.descripcion,
      codigoProveedor: body.codigoProveedor,
      repuestoId: body.repuestoId,
      esMoto: body.esMoto,
      cantidad: body.cantidad,
      precioFOBUnitario: body.precioFOBUnitario,
      subtotalFOB,
      posicionArancelaria: body.posicionArancelaria,
      alicuotaDerechos: body.alicuotaDerechos,
    },
  });

  // Recalcular totalFOB
  const items = await prisma.itemEmbarque.findMany({ where: { embarqueId: id } });
  const totalFOB = items.reduce((sum, i) => sum + Number(i.subtotalFOB), 0);
  await prisma.embarqueImportacion.update({
    where: { id },
    data: { totalFOB },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.shipment.update,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id, itemId } = await params;
  const embarque = await prisma.embarqueImportacion.findUnique({ where: { id } });
  if (!embarque || embarque.estado !== "BORRADOR") {
    return NextResponse.json(
      { error: "Solo se puede eliminar items en estado BORRADOR" },
      { status: 400 }
    );
  }

  await prisma.itemEmbarque.delete({ where: { id: itemId } });

  // Recalcular totalFOB
  const items = await prisma.itemEmbarque.findMany({ where: { embarqueId: id } });
  const totalFOB = items.reduce((sum, i) => sum + Number(i.subtotalFOB), 0);
  await prisma.embarqueImportacion.update({
    where: { id },
    data: { totalFOB },
  });

  return NextResponse.json({ ok: true });
}
