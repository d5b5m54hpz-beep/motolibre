import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { facturaCompraPagarSchema } from "@/lib/validations/factura-compra";
import { apiSetup } from "@/lib/api-helpers";
import { CUENTAS } from "@/lib/contabilidad-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.invoicing.purchaseInvoice.approve,
    "canExecute",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = facturaCompraPagarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const fc = await prisma.facturaCompra.findUnique({ where: { id } });
  if (!fc) {
    return NextResponse.json({ error: "Factura de compra no encontrada" }, { status: 404 });
  }
  if (fc.estado === "PAGADA" || fc.estado === "ANULADA") {
    return NextResponse.json(
      { error: `No se puede pagar factura en estado ${fc.estado}` },
      { status: 422 }
    );
  }

  const nuevoMontoPagado = Number(fc.montoPagado) + parsed.data.monto;
  const totalFactura = Number(fc.montoTotal);
  const nuevoEstado = nuevoMontoPagado >= totalFactura ? "PAGADA" : "PARCIAL";

  const updated = await prisma.facturaCompra.update({
    where: { id },
    data: {
      montoPagado: nuevoMontoPagado,
      estado: nuevoEstado,
    },
  });

  // Emitir evento para asiento de pago a proveedor
  // DEBE: Proveedores / HABER: Caja o Banco
  const medioPago = parsed.data.medioPago || "CAJA";
  const ctaPago = medioPago === "MP" ? CUENTAS.BANCO_MP :
    medioPago === "BANCO_BIND" ? CUENTAS.BANCO_BIND : CUENTAS.CAJA;

  await eventBus.emit(
    OPERATIONS.invoicing.purchaseInvoice.approve,
    "FacturaCompra",
    id,
    {
      monto: parsed.data.monto,
      cuentaPago: ctaPago,
      proveedorNombre: fc.proveedorNombre,
      numeroCompleto: fc.numeroCompleto,
    },
    userId
  ).catch((err) => console.error("[FC Pago] Error emitiendo evento contable:", err));

  return NextResponse.json({ data: updated });
}
