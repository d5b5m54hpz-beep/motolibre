import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { notaCreditoCreateSchema } from "@/lib/validations/nota-credito";
import { obtenerCAENotaCredito } from "@/lib/facturacion-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.invoicing.creditNote.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") || "1");
  const limit = Number(sp.get("limit") || "50");

  const [ncs, total] = await Promise.all([
    prisma.notaCredito.findMany({
      orderBy: { fechaEmision: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notaCredito.count(),
  ]);

  return NextResponse.json({ data: ncs, total, page, limit });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.invoicing.creditNote.create,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = notaCreditoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Buscar factura original
  const factura = await prisma.factura.findUnique({
    where: { id: parsed.data.facturaId },
  });
  if (!factura) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }
  if (factura.estado === "ANULADA") {
    return NextResponse.json({ error: "La factura ya está anulada" }, { status: 422 });
  }

  // Determinar montos
  let montoTotal = parsed.data.montoTotal;
  if (parsed.data.tipo === "ANULACION") {
    montoTotal = Number(factura.montoTotal);
  }

  // Calcular neto e IVA según tipo de factura original
  let montoNeto: number;
  let montoIva: number;
  if (factura.tipo === "A") {
    montoNeto = Math.round((montoTotal / 1.21) * 100) / 100;
    montoIva = Math.round((montoTotal - montoNeto) * 100) / 100;
  } else {
    montoNeto = montoTotal;
    montoIva = 0;
  }

  // Numeración NC
  const tipoComprobante = factura.tipo === "A" ? "NCA" : "NCB";
  const puntoVenta = "0001";
  const ultimaNC = await prisma.notaCredito.findFirst({
    where: { tipoComprobante, puntoVenta },
    orderBy: { numero: "desc" },
  });
  const numero = (ultimaNC?.numero ?? 0) + 1;
  const numeroCompleto = `${tipoComprobante}-${puntoVenta}-${String(numero).padStart(8, "0")}`;

  // Solicitar CAE a AFIP (real o stub según config)
  const afipResult = await obtenerCAENotaCredito({
    letraFacturaOriginal: factura.tipo,
    puntoVenta,
    importeNeto: montoNeto,
    importeIVA: montoIva,
    importeTotal: montoTotal,
    condicionIVAReceptor: factura.receptorCondicionIva,
    documentoReceptor: factura.receptorCuit || "0",
    facturaOriginalNumero: factura.numero,
    facturaOriginalPuntoVenta: factura.puntoVenta,
    facturaOriginalFecha: factura.fechaEmision,
  });

  if (afipResult.afipResultado === "R") {
    console.error(`[NC] AFIP rechazó nota de crédito: ${afipResult.afipObservaciones}`);
  }

  const nc = await prisma.notaCredito.create({
    data: {
      tipo: parsed.data.tipo,
      tipoComprobante,
      puntoVenta,
      numero,
      numeroCompleto,
      facturaId: factura.id,
      facturaNumero: factura.numeroCompleto,
      receptorNombre: factura.receptorNombre,
      receptorCuit: factura.receptorCuit,
      receptorCondicionIva: factura.receptorCondicionIva,
      montoNeto,
      montoIva,
      montoTotal,
      motivo: parsed.data.motivo,
      clienteId: factura.clienteId,
      cae: afipResult.cae || null,
      caeVencimiento: afipResult.caeVencimiento,
      afipResultado: afipResult.afipResultado,
      afipObservaciones: afipResult.afipObservaciones,
    },
  });

  // Si es anulación, marcar factura como anulada
  if (parsed.data.tipo === "ANULACION") {
    await prisma.factura.update({
      where: { id: factura.id },
      data: { estado: "ANULADA" },
    });
  }

  // Emitir evento para handler contable
  await eventBus.emit(
    OPERATIONS.invoicing.creditNote.create,
    "NotaCredito",
    nc.id,
    { tipo: parsed.data.tipo, montoTotal },
    userId
  ).catch((err) => console.error("[NC] Error emitiendo evento contable:", err));

  return NextResponse.json({ data: nc }, { status: 201 });
}
