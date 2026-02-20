import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { motoCreateSchema } from "@/lib/validations/moto";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") ?? "1");
  const limit = parseInt(sp.get("limit") ?? "50");
  const estado = sp.get("estado");
  const tipo = sp.get("tipo");
  const marca = sp.get("marca");
  const search = sp.get("search");

  const where: Record<string, unknown> = {};
  if (estado) where.estado = estado;
  if (tipo) where.tipo = tipo;
  if (marca) where.marca = { contains: marca, mode: "insensitive" };
  if (search) {
    where.OR = [
      { patente: { contains: search, mode: "insensitive" } },
      { marca: { contains: search, mode: "insensitive" } },
      { modelo: { contains: search, mode: "insensitive" } },
      { numMotor: { contains: search, mode: "insensitive" } },
      { numChasis: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.moto.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { documentos: true, historialEstados: true } },
      },
    }),
    prisma.moto.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.create,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = motoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.patente) {
    const exists = await prisma.moto.findUnique({ where: { patente: data.patente } });
    if (exists) return NextResponse.json({ error: "Patente ya registrada" }, { status: 409 });
  }

  const moto = await withEvent(
    OPERATIONS.fleet.moto.create,
    "Moto",
    () =>
      prisma.moto.create({
        data: {
          ...data,
          precioCompra: data.precioCompra ?? undefined,
          fechaCompra: data.fechaCompra ? new Date(data.fechaCompra) : undefined,
          cotizacionCompra: data.cotizacionCompra ?? undefined,
          precioAlquilerMensual: data.precioAlquilerMensual ?? undefined,
          valorResidual: data.valorResidual,
          fechaAltaContable: data.fechaAltaContable ? new Date(data.fechaAltaContable) : undefined,
          creadoPor: userId,
        },
      }),
    userId
  );

  return NextResponse.json({ data: moto }, { status: 201 });
}
