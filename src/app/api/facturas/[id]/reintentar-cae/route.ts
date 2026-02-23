import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { obtenerCAEFactura } from "@/lib/facturacion-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.invoicing.invoice.create,
    "canExecute",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const factura = await prisma.factura.findUnique({
    where: { id },
  });
  if (!factura) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  if (factura.afipResultado === "A") {
    return NextResponse.json({ error: "La factura ya tiene CAE aprobado" }, { status: 422 });
  }

  try {
    const result = await obtenerCAEFactura({
      tipo: factura.tipo,
      puntoVenta: factura.puntoVenta,
      importeNeto: Number(factura.montoNeto),
      importeIVA: Number(factura.montoIva),
      importeTotal: Number(factura.montoTotal),
      condicionIVAReceptor: factura.receptorCondicionIva,
      documentoReceptor: factura.receptorCuit || "0",
      periodoDesde: factura.periodoDesde,
      periodoHasta: factura.periodoHasta,
    });

    const updated = await prisma.factura.update({
      where: { id },
      data: {
        cae: result.cae || null,
        caeVencimiento: result.caeVencimiento,
        afipResultado: result.afipResultado,
        afipObservaciones: result.afipObservaciones,
        afipReintentos: { increment: 1 },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
