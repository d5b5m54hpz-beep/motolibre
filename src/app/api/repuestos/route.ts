import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { repuestoCreateSchema } from "@/lib/validations/repuesto";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const categoria = sp.get("categoria");
  const proveedorId = sp.get("proveedorId");
  const search = sp.get("search");
  const stockBajo = sp.get("stockBajo");
  const activo = sp.get("activo");
  const page = parseInt(sp.get("page") || "1");
  const limit = parseInt(sp.get("limit") || "100");

  const where: Record<string, unknown> = {};

  if (activo !== null && activo !== "") {
    where.activo = activo !== "false";
  } else {
    where.activo = true;
  }

  if (categoria && categoria !== "all") {
    where.categoria = categoria;
  }

  if (proveedorId) {
    where.proveedorId = proveedorId;
  }

  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: "insensitive" } },
      { nombre: { contains: search, mode: "insensitive" } },
      { marca: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.repuesto.findMany({
      where,
      include: {
        ubicacion: { select: { id: true, codigo: true, nombre: true } },
      },
      orderBy: { nombre: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.repuesto.count({ where }),
  ]);

  // If stockBajo filter, do post-filter (Prisma can't compare columns)
  let filtered = data;
  if (stockBajo === "true") {
    filtered = data.filter((r) => r.stock <= r.stockMinimo);
  }

  return NextResponse.json({ data: filtered, total, page, limit });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = repuestoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.repuesto.findUnique({
    where: { codigo: parsed.data.codigo },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Ya existe un repuesto con código ${parsed.data.codigo}` },
      { status: 409 }
    );
  }

  const repuesto = await prisma.repuesto.create({
    data: {
      codigo: parsed.data.codigo,
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion ?? undefined,
      categoria: parsed.data.categoria,
      marca: parsed.data.marca ?? undefined,
      modeloCompatible: parsed.data.modeloCompatible,
      stockMinimo: parsed.data.stockMinimo,
      stockMaximo: parsed.data.stockMaximo ?? undefined,
      unidad: parsed.data.unidad,
      precioCompra: parsed.data.precioCompra,
      precioVenta: parsed.data.precioVenta ?? undefined,
      moneda: parsed.data.moneda,
      precioFOB: parsed.data.precioFOB ?? undefined,
      proveedorId: parsed.data.proveedorId ?? undefined,
      proveedorCodigo: parsed.data.proveedorCodigo ?? undefined,
      ubicacionId: parsed.data.ubicacionId ?? undefined,
    },
  });

  return NextResponse.json({ data: repuesto }, { status: 201 });
}
