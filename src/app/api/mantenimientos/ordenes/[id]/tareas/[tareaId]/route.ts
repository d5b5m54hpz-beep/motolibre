import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { tareaResultadoSchema } from "@/lib/validations/orden-trabajo";
import { apiSetup } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tareaId: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { tareaId } = await params;
  const body = await req.json();
  const parsed = tareaResultadoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tarea = await prisma.tareaOrdenTrabajo.update({
    where: { id: tareaId },
    data: {
      resultado: parsed.data.resultado,
      observaciones: parsed.data.observaciones ?? undefined,
    },
  });

  return NextResponse.json({ data: tarea });
}
