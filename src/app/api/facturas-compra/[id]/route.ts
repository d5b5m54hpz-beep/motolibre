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
    OPERATIONS.invoicing.purchaseInvoice.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const fc = await prisma.facturaCompra.findUnique({ where: { id } });
  if (!fc) {
    return NextResponse.json({ error: "Factura de compra no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: fc });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.invoicing.purchaseInvoice.update,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const fc = await prisma.facturaCompra.findUnique({ where: { id } });
  if (!fc) {
    return NextResponse.json({ error: "Factura de compra no encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.facturaCompra.update({
    where: { id },
    data: {
      concepto: body.concepto,
      categoria: body.categoria,
      archivoUrl: body.archivoUrl,
    },
  });

  return NextResponse.json({ data: updated });
}
