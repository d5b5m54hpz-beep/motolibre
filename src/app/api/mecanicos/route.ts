import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { mecanicoCreateSchema } from "@/lib/validations/taller";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workshop.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const tallerId = req.nextUrl.searchParams.get("tallerId");

  const where = tallerId ? { tallerId } : {};

  const mecanicos = await prisma.mecanico.findMany({
    where,
    include: { taller: { select: { id: true, nombre: true, tipo: true } } },
    orderBy: [{ nombre: "asc" }, { apellido: "asc" }],
  });

  return NextResponse.json({ data: mecanicos });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workshop.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = mecanicoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const mecanico = await prisma.mecanico.create({
    data: {
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido,
      telefono: parsed.data.telefono ?? undefined,
      email: parsed.data.email ?? undefined,
      especialidad: parsed.data.especialidad ?? undefined,
      tallerId: parsed.data.tallerId,
    },
    include: { taller: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json({ data: mecanico }, { status: 201 });
}
