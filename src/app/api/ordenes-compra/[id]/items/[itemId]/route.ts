import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { itemOCCreateSchema } from "@/lib/validations/orden-compra";
import { apiSetup } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.purchaseOrder.create,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id, itemId } = await params;

  const oc = await prisma.ordenCompra.findUnique({
    where: { id },
    select: { estado: true },
  });
  if (!oc || oc.estado !== "BORRADOR") {
    return NextResponse.json({ error: "Solo se pueden editar items en BORRADOR" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = itemOCCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const subtotal = parsed.data.cantidad * parsed.data.precioUnitario;

  const item = await prisma.itemOrdenCompra.update({
    where: { id: itemId },
    data: {
      descripcion: parsed.data.descripcion,
      codigo: parsed.data.codigo ?? undefined,
      repuestoId: parsed.data.repuestoId ?? undefined,
      cantidad: parsed.data.cantidad,
      precioUnitario: parsed.data.precioUnitario,
      subtotal,
    },
  });

  await recalcularTotales(id);

  return NextResponse.json({ data: item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.purchaseOrder.create,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id, itemId } = await params;

  const oc = await prisma.ordenCompra.findUnique({
    where: { id },
    select: { estado: true },
  });
  if (!oc || oc.estado !== "BORRADOR") {
    return NextResponse.json({ error: "Solo se pueden eliminar items en BORRADOR" }, { status: 400 });
  }

  await prisma.itemOrdenCompra.delete({ where: { id: itemId } });
  await recalcularTotales(id);

  return NextResponse.json({ ok: true });
}

async function recalcularTotales(ocId: string) {
  const items = await prisma.itemOrdenCompra.findMany({
    where: { ordenCompraId: ocId },
  });

  const montoSubtotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0);

  const oc = await prisma.ordenCompra.findUnique({
    where: { id: ocId },
    include: { proveedor: { select: { tipoProveedor: true, condicionIva: true } } },
  });

  const esNacionalRI =
    oc?.proveedor.tipoProveedor === "NACIONAL" &&
    oc?.proveedor.condicionIva?.toLowerCase().includes("responsable inscripto");
  const montoIva = esNacionalRI ? montoSubtotal * 0.21 : 0;

  await prisma.ordenCompra.update({
    where: { id: ocId },
    data: {
      montoSubtotal,
      montoIva,
      montoTotal: montoSubtotal + montoIva,
    },
  });
}
