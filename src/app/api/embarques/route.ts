import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { eventBus } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { embarqueCreateSchema } from "@/lib/validations/embarque";
import { proximoNumeroEmbarque } from "@/lib/importacion-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.shipment.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const estado = sp.get("estado");
  const proveedorId = sp.get("proveedorId");
  const fechaDesde = sp.get("fechaDesde");
  const fechaHasta = sp.get("fechaHasta");
  const search = sp.get("search");

  const where: Record<string, unknown> = {};
  if (estado) where.estado = estado;
  if (proveedorId) where.proveedorId = proveedorId;
  if (fechaDesde || fechaHasta) {
    const fechaFilter: Record<string, unknown> = {};
    if (fechaDesde) fechaFilter.gte = new Date(fechaDesde);
    if (fechaHasta) fechaFilter.lte = new Date(fechaHasta);
    where.fechaEmbarque = fechaFilter;
  }
  if (search) {
    where.OR = [
      { numero: { contains: search, mode: "insensitive" } },
      { proveedorNombre: { contains: search, mode: "insensitive" } },
    ];
  }

  const embarques = await prisma.embarqueImportacion.findMany({
    where,
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: embarques, total: embarques.length });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.supply.shipment.create,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = embarqueCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const proveedor = await prisma.proveedor.findUnique({
    where: { id: parsed.data.proveedorId },
    select: { id: true, nombre: true },
  });
  if (!proveedor) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  const numero = await proximoNumeroEmbarque();
  const totalFOB = parsed.data.items.reduce(
    (sum, item) => sum + item.precioFOBUnitario * item.cantidad,
    0
  );

  const embarque = await prisma.embarqueImportacion.create({
    data: {
      numero,
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      puertoOrigen: parsed.data.puertoOrigen,
      naviera: parsed.data.naviera,
      numeroContenedor: parsed.data.numeroContenedor,
      numeroBL: parsed.data.numeroBL,
      tipoTransporte: parsed.data.tipoTransporte,
      monedaFOB: parsed.data.monedaFOB,
      totalFOB,
      fechaEmbarque: parsed.data.fechaEmbarque ? new Date(parsed.data.fechaEmbarque) : null,
      fechaEstimadaArribo: parsed.data.fechaEstimadaArribo ? new Date(parsed.data.fechaEstimadaArribo) : null,
      observaciones: parsed.data.observaciones,
      creadoPor: userId,
      items: {
        create: parsed.data.items.map((item) => ({
          descripcion: item.descripcion,
          codigoProveedor: item.codigoProveedor,
          repuestoId: item.repuestoId,
          esMoto: item.esMoto,
          cantidad: item.cantidad,
          precioFOBUnitario: item.precioFOBUnitario,
          subtotalFOB: item.precioFOBUnitario * item.cantidad,
          posicionArancelaria: item.posicionArancelaria,
          alicuotaDerechos: item.alicuotaDerechos,
        })),
      },
    },
    include: { items: true },
  });

  await eventBus.emit(
    OPERATIONS.supply.shipment.create,
    "EmbarqueImportacion",
    embarque.id,
    { numero, totalFOB, proveedorId: proveedor.id },
    userId
  );

  return NextResponse.json(embarque, { status: 201 });
}
