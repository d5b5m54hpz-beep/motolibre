import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { proveedorCreateSchema } from "@/lib/validations/proveedor";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.supplier.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const tipo = sp.get("tipo");
  const activo = sp.get("activo");
  const search = sp.get("search");
  const categoria = sp.get("categoria");

  const where: Record<string, unknown> = {};
  if (tipo) where.tipoProveedor = tipo;
  if (activo !== null && activo !== "") where.activo = activo !== "false";
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: "insensitive" } },
      { cuit: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoria) {
    where.categorias = { has: categoria };
  }

  const proveedores = await prisma.proveedor.findMany({
    where,
    include: {
      _count: { select: { ordenesCompra: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ data: proveedores });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.supplier.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = proveedorCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const proveedor = await prisma.proveedor.create({
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

  return NextResponse.json({ data: proveedor }, { status: 201 });
}
