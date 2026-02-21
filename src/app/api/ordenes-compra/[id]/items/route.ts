import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { itemOCCreateSchema } from "@/lib/validations/orden-compra";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
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

  // Only add items in BORRADOR
  const oc = await prisma.ordenCompra.findUnique({
    where: { id },
    select: { estado: true, proveedorId: true },
  });
  if (!oc) {
    return NextResponse.json({ error: "OC no encontrada" }, { status: 404 });
  }
  if (oc.estado !== "BORRADOR") {
    return NextResponse.json({ error: "Solo se pueden agregar items en BORRADOR" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = itemOCCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const subtotal = parsed.data.cantidad * parsed.data.precioUnitario;

  const item = await prisma.itemOrdenCompra.create({
    data: {
      ordenCompraId: id,
      descripcion: parsed.data.descripcion,
      codigo: parsed.data.codigo ?? undefined,
      repuestoId: parsed.data.repuestoId ?? undefined,
      cantidad: parsed.data.cantidad,
      precioUnitario: parsed.data.precioUnitario,
      subtotal,
    },
  });

  // Recalculate OC totals
  await recalcularTotales(id);

  return NextResponse.json({ data: item }, { status: 201 });
}

async function recalcularTotales(ocId: string) {
  const items = await prisma.itemOrdenCompra.findMany({
    where: { ordenCompraId: ocId },
  });

  const montoSubtotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0);

  // Fetch proveedor to calc IVA
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
