import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { clienteCreateSchema } from "@/lib/validations/cliente";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.commercial.client.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") ?? "1");
  const limit = parseInt(sp.get("limit") ?? "50");
  const estado = sp.get("estado");
  const search = sp.get("search");

  const where: Record<string, unknown> = {};
  if (estado) where.estado = estado;
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: "insensitive" } },
      { apellido: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { dni: { contains: search, mode: "insensitive" } },
      { telefono: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { documentos: true } },
      },
    }),
    prisma.cliente.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.client.create,
    "canCreate",
    ["ADMIN", "OPERADOR", "COMERCIAL"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = clienteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const [emailExists, dniExists] = await Promise.all([
    prisma.cliente.findUnique({ where: { email: data.email } }),
    prisma.cliente.findUnique({ where: { dni: data.dni } }),
  ]);
  if (emailExists) return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
  if (dniExists) return NextResponse.json({ error: "DNI ya registrado" }, { status: 409 });

  if (data.cuit) {
    const cuitExists = await prisma.cliente.findUnique({ where: { cuit: data.cuit } });
    if (cuitExists) return NextResponse.json({ error: "CUIT ya registrado" }, { status: 409 });
  }

  const cliente = await withEvent(
    OPERATIONS.commercial.client.create,
    "Cliente",
    () =>
      prisma.cliente.create({
        data: {
          ...data,
          fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : undefined,
          fechaVencLicencia: data.fechaVencLicencia ? new Date(data.fechaVencLicencia) : undefined,
          creadoPor: userId,
        },
      }),
    userId
  );

  return NextResponse.json({ data: cliente }, { status: 201 });
}
