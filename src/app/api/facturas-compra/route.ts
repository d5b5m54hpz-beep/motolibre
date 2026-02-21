import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { facturaCompraCreateSchema } from "@/lib/validations/factura-compra";
import { apiSetup } from "@/lib/api-helpers";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.invoicing.purchaseInvoice.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") || "1");
  const limit = Number(sp.get("limit") || "50");
  const tipo = sp.get("tipo");
  const estado = sp.get("estado");
  const proveedor = sp.get("proveedor");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");

  const where: Prisma.FacturaCompraWhereInput = {};
  if (tipo) where.tipo = tipo as Prisma.FacturaCompraWhereInput["tipo"];
  if (estado) where.estado = estado as Prisma.FacturaCompraWhereInput["estado"];
  if (proveedor) {
    where.proveedorNombre = { contains: proveedor, mode: "insensitive" };
  }
  if (desde || hasta) {
    where.fechaEmision = {};
    if (desde) where.fechaEmision.gte = new Date(desde);
    if (hasta) where.fechaEmision.lte = new Date(hasta);
  }

  const [facturas, total] = await Promise.all([
    prisma.facturaCompra.findMany({
      where,
      orderBy: { fechaEmision: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.facturaCompra.count({ where }),
  ]);

  return NextResponse.json({ data: facturas, total, page, limit });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.invoicing.purchaseInvoice.create,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = facturaCompraCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const numeroCompleto = `${parsed.data.tipo}-${parsed.data.puntoVenta}-${parsed.data.numero}`;

  const fc = await prisma.facturaCompra.create({
    data: {
      proveedorNombre: parsed.data.proveedorNombre,
      proveedorCuit: parsed.data.proveedorCuit,
      proveedorCondicionIva: parsed.data.proveedorCondicionIva,
      tipo: parsed.data.tipo,
      puntoVenta: parsed.data.puntoVenta,
      numero: parsed.data.numero,
      numeroCompleto,
      montoNeto: parsed.data.montoNeto,
      montoIva: parsed.data.montoIva,
      montoTotal: parsed.data.montoTotal,
      fechaEmision: new Date(parsed.data.fechaEmision),
      fechaVencimiento: parsed.data.fechaVencimiento
        ? new Date(parsed.data.fechaVencimiento)
        : undefined,
      cae: parsed.data.cae ?? undefined,
      concepto: parsed.data.concepto,
      categoria: parsed.data.categoria ?? undefined,
      motoId: parsed.data.motoId ?? undefined,
      estado: "PENDIENTE",
    },
  });

  // Emitir evento para handler contable
  await eventBus.emit(
    OPERATIONS.invoicing.purchaseInvoice.create,
    "FacturaCompra",
    fc.id,
    { tipo: parsed.data.tipo, montoTotal: parsed.data.montoTotal },
    userId
  ).catch((err) => console.error("[FC] Error emitiendo evento contable:", err));

  return NextResponse.json({ data: fc }, { status: 201 });
}
