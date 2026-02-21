import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { generarPDFFactura } from "@/lib/factura-pdf";

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

  const pdfBuffer = await generarPDFFactura(factura);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="factura-${factura.numeroCompleto}.pdf"`,
    },
  });
}
