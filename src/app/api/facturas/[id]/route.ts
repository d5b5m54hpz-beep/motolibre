import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.invoicing.invoice.create,
    "canView",
    ["ADMIN", "CONTADOR", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const factura = await prisma.factura.findUnique({ where: { id } });
  if (!factura) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: factura });
}
