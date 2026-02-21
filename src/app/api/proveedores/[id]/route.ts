import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { proveedorCreateSchema } from "@/lib/validations/proveedor";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.supplier.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const proveedor = await prisma.proveedor.findUnique({
    where: { id },
    include: {
      ordenesCompra: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, numero: true, estado: true, montoTotal: true, moneda: true, fechaEmision: true },
      },
      _count: { select: { ordenesCompra: true } },
    },
  });

  if (!proveedor) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  // Count facturas compra linked by proveedorId
  const facturasCount = await prisma.facturaCompra.count({
    where: { proveedorId: id },
  });

  return NextResponse.json({ data: { ...proveedor, _facturasCount: facturasCount } });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.supplier.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = proveedorCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const proveedor = await prisma.proveedor.update({
    where: { id },
    data: {
      nombre: parsed.data.nombre,
      cuit: parsed.data.cuit ?? undefined,
      direccion: parsed.data.direccion ?? undefined,
      ciudad: parsed.data.ciudad ?? undefined,
      provincia: parsed.data.provincia ?? undefined,
      pais: parsed.data.pais,
      telefono: parsed.data.telefono ?? undefined,
      email: parsed.data.email ?? undefined,
      contacto: parsed.data.contacto ?? undefined,
      tipoProveedor: parsed.data.tipoProveedor,
      condicionIva: parsed.data.condicionIva ?? undefined,
      categorias: parsed.data.categorias,
      notas: parsed.data.notas ?? undefined,
      cbu: parsed.data.cbu ?? undefined,
      alias: parsed.data.alias ?? undefined,
      banco: parsed.data.banco ?? undefined,
    },
  });

  return NextResponse.json({ data: proveedor });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.supplier.deactivate,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const proveedor = await prisma.proveedor.update({
    where: { id },
    data: { activo: false },
  });

  return NextResponse.json({ data: proveedor });
}
