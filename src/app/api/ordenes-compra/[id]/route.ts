import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.purchaseOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const oc = await prisma.ordenCompra.findUnique({
    where: { id },
    include: {
      proveedor: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!oc) {
    return NextResponse.json({ error: "Orden de compra no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: oc });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.purchaseOrder.create,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;

  // Only editable in BORRADOR
  const existing = await prisma.ordenCompra.findUnique({
    where: { id },
    select: { estado: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "OC no encontrada" }, { status: 404 });
  }
  if (existing.estado !== "BORRADOR") {
    return NextResponse.json({ error: "Solo se puede editar en estado BORRADOR" }, { status: 400 });
  }

  const body = await req.json();
  const oc = await prisma.ordenCompra.update({
    where: { id },
    data: {
      fechaEntregaEstimada: body.fechaEntregaEstimada
        ? new Date(body.fechaEntregaEstimada)
        : undefined,
      observaciones: body.observaciones ?? undefined,
      moneda: body.moneda ?? undefined,
    },
    include: {
      proveedor: { select: { id: true, nombre: true } },
      items: true,
    },
  });

  return NextResponse.json({ data: oc });
}
