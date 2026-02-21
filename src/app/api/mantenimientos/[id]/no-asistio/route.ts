import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workshop.create,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const mant = await prisma.mantenimientoProgramado.findUnique({ where: { id } });
  if (!mant) {
    return NextResponse.json({ error: "Mantenimiento no encontrado" }, { status: 404 });
  }

  const updated = await prisma.mantenimientoProgramado.update({
    where: { id },
    data: {
      estado: "NO_ASISTIO",
      fechaRealizada: new Date(),
    },
  });

  return NextResponse.json({ data: updated });
}
