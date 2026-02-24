import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  empresa: z.string().optional(),
  tipo: z.enum([
    "PROVEEDOR",
    "CONTADOR",
    "ABOGADO",
    "DESPACHANTE",
    "ASEGURADORA",
    "TALLER_EXTERNO",
    "CLIENTE_POTENCIAL",
    "OTRO",
  ]),
  telefono: z.string().optional(),
  notas: z.string().optional(),
});

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.contact.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const tipo = searchParams.get("tipo");
  const search = searchParams.get("search");
  const activo = searchParams.get("activo");

  const where: Record<string, unknown> = {};
  if (tipo) where.tipo = tipo;
  if (activo !== null && activo !== undefined && activo !== "") {
    where.activo = activo === "true";
  }
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { empresa: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.contacto.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { conversaciones: true } },
      },
    }),
    prisma.contacto.count({ where }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.communication.contact.create,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.contacto.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un contacto con ese email" },
      { status: 409 }
    );
  }

  const contacto = await prisma.contacto.create({
    data: parsed.data,
  });

  console.log(
    `[comunicacion] Contacto creado: ${contacto.nombre} por ${session?.user?.name}`
  );

  return NextResponse.json({ data: contacto }, { status: 201 });
}
