import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { tareaCreateSchema } from "@/lib/validations/orden-trabajo";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const tareas = await prisma.tareaOrdenTrabajo.findMany({
    where: { ordenTrabajoId: id },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json({ data: tareas });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = tareaCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Get max orden
  const maxOrden = await prisma.tareaOrdenTrabajo.aggregate({
    where: { ordenTrabajoId: id },
    _max: { orden: true },
  });

  const tarea = await prisma.tareaOrdenTrabajo.create({
    data: {
      ordenTrabajoId: id,
      categoria: parsed.data.categoria,
      descripcion: parsed.data.descripcion,
      orden: (maxOrden._max.orden ?? 0) + 1,
    },
  });

  return NextResponse.json({ data: tarea }, { status: 201 });
}
