import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { tallerCreateSchema } from "@/lib/validations/taller";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workshop.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const talleres = await prisma.taller.findMany({
    include: {
      mecanicos: { where: { activo: true }, orderBy: { nombre: "asc" } },
      _count: { select: { mecanicos: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ data: talleres });
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
  const parsed = tallerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const taller = await prisma.taller.create({
    data: {
      nombre: parsed.data.nombre,
      tipo: parsed.data.tipo,
      direccion: parsed.data.direccion ?? undefined,
      telefono: parsed.data.telefono ?? undefined,
      email: parsed.data.email ?? undefined,
      contacto: parsed.data.contacto ?? undefined,
      especialidades: parsed.data.especialidades,
      notas: parsed.data.notas ?? undefined,
      tarifaHora: parsed.data.tarifaHora ?? undefined,
    },
  });

  return NextResponse.json({ data: taller }, { status: 201 });
}
