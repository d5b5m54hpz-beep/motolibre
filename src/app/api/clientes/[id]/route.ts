import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { clienteUpdateSchema } from "@/lib/validations/cliente";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.commercial.client.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      documentos: { orderBy: { createdAt: "desc" } },
      puntajes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const scoreCalculado =
    cliente.puntajes.length > 0
      ? Math.round(
          cliente.puntajes.reduce((sum, p) => sum + p.valor, 0) / cliente.puntajes.length
        )
      : null;

  return NextResponse.json({ data: { ...cliente, scoreCalculado } });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.client.update,
    "canCreate",
    ["ADMIN", "OPERADOR", "COMERCIAL"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = clienteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.cliente.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const data = parsed.data;
  if (data.email && data.email !== existing.email) {
    const exists = await prisma.cliente.findUnique({ where: { email: data.email } });
    if (exists) return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
  }
  if (data.dni && data.dni !== existing.dni) {
    const exists = await prisma.cliente.findUnique({ where: { dni: data.dni } });
    if (exists) return NextResponse.json({ error: "DNI ya registrado" }, { status: 409 });
  }

  const cliente = await withEvent(
    OPERATIONS.commercial.client.update,
    "Cliente",
    () =>
      prisma.cliente.update({
        where: { id },
        data: {
          ...data,
          fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : undefined,
          fechaVencLicencia: data.fechaVencLicencia ? new Date(data.fechaVencLicencia) : undefined,
        },
      }),
    userId
  );

  return NextResponse.json({ data: cliente });
}
