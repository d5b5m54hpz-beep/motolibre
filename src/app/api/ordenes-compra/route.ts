import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ordenCompraCreateSchema } from "@/lib/validations/orden-compra";
import { proximoNumeroOC } from "@/lib/oc-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.purchaseOrder.create,
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
    where.fechaEmision = fechaFilter;
  }
  if (search) {
    where.OR = [
      { numero: { contains: search, mode: "insensitive" } },
      { proveedor: { nombre: { contains: search, mode: "insensitive" } } },
    ];
  }

  const ordenes = await prisma.ordenCompra.findMany({
    where,
    include: {
      proveedor: { select: { id: true, nombre: true, tipoProveedor: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: ordenes, total: ordenes.length });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.purchaseOrder.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = ordenCompraCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Fetch proveedor to determine IVA
  const proveedor = await prisma.proveedor.findUnique({
    where: { id: parsed.data.proveedorId },
    select: { id: true, tipoProveedor: true, condicionIva: true },
  });
  if (!proveedor) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  // Calculate items subtotals
  const itemsData = parsed.data.items.map((item) => ({
    descripcion: item.descripcion,
    codigo: item.codigo ?? undefined,
    repuestoId: item.repuestoId ?? undefined,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
    subtotal: item.cantidad * item.precioUnitario,
  }));

  const montoSubtotal = itemsData.reduce((sum, i) => sum + i.subtotal, 0);

  // IVA 21% for national RI suppliers
  const esNacionalRI =
    proveedor.tipoProveedor === "NACIONAL" &&
    proveedor.condicionIva?.toLowerCase().includes("responsable inscripto");
  const montoIva = esNacionalRI ? montoSubtotal * 0.21 : 0;
  const montoTotal = montoSubtotal + montoIva;

  const numero = await proximoNumeroOC();

  const oc = await prisma.$transaction(async (tx) => {
    return tx.ordenCompra.create({
      data: {
        numero,
        proveedorId: parsed.data.proveedorId,
        estado: "BORRADOR",
        moneda: parsed.data.moneda,
        fechaEntregaEstimada: parsed.data.fechaEntregaEstimada
          ? new Date(parsed.data.fechaEntregaEstimada)
          : undefined,
        observaciones: parsed.data.observaciones ?? undefined,
        montoSubtotal,
        montoIva,
        montoTotal,
        items: {
          create: itemsData,
        },
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        items: true,
      },
    });
  });

  return NextResponse.json({ data: oc }, { status: 201 });
}
