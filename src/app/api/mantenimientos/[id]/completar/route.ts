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
  const body = await req.json().catch(() => ({}));

  const mant = await prisma.mantenimientoProgramado.findUnique({ where: { id } });
  if (!mant) {
    return NextResponse.json({ error: "Mantenimiento no encontrado" }, { status: 404 });
  }
  if (mant.estado !== "PROGRAMADO" && mant.estado !== "NOTIFICADO") {
    return NextResponse.json(
      { error: `No se puede completar mantenimiento en estado ${mant.estado}` },
      { status: 422 }
    );
  }

  const updated = await prisma.mantenimientoProgramado.update({
    where: { id },
    data: {
      estado: "COMPLETADO",
      fechaRealizada: new Date(),
      notasOperador: body.notas ?? null,
    },
  });

  return NextResponse.json({ data: updated });
}
