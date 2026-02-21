import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { mecanicoCreateSchema } from "@/lib/validations/taller";
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
  const mecanico = await prisma.mecanico.findUnique({
    where: { id },
    include: { taller: true },
  });

  if (!mecanico) {
    return NextResponse.json({ error: "Mecánico no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: mecanico });
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
  const parsed = mecanicoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const mecanico = await prisma.mecanico.update({
    where: { id },
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

  return NextResponse.json({ data: mecanico });
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
  const mecanico = await prisma.mecanico.update({
    where: { id },
    data: { activo: false },
  });

  return NextResponse.json({ data: mecanico });
}
