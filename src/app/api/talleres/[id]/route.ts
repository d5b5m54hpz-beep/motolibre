import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { tallerCreateSchema } from "@/lib/validations/taller";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workshop.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const taller = await prisma.taller.findUnique({
    where: { id },
    include: {
      mecanicos: { orderBy: { nombre: "asc" } },
    },
  });

  if (!taller) {
    return NextResponse.json({ error: "Taller no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: taller });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workshop.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = tallerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const taller = await prisma.taller.update({
    where: { id },
    data: {
      nombre: parsed.data.nombre,
      tipo: parsed.data.tipo,
      direccion: parsed.data.direccion ?? undefined,
      telefono: parsed.data.telefono ?? undefined,
      email: parsed.data.email ?? undefined,
      contacto: parsed.data.contacto ?? undefined,
      especialidades: parsed.data.especialidades,
      notas: parsed.data.notas ?? undefined,
    },
  });

  return NextResponse.json({ data: taller });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workshop.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  // Soft delete
  const taller = await prisma.taller.update({
    where: { id },
    data: { activo: false },
  });

  return NextResponse.json({ data: taller });
}
