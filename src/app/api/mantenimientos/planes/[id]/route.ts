import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { planMantenimientoSchema } from "@/lib/validations/orden-trabajo";
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
  const plan = await prisma.planMantenimiento.findUnique({
    where: { id },
    include: {
      tareas: { orderBy: { orden: "asc" } },
      repuestos: true,
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: plan });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = planMantenimientoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const plan = await prisma.planMantenimiento.update({
    where: { id },
    data: {
      nombre: parsed.data.nombre,
      tipoService: parsed.data.tipoService,
      descripcion: parsed.data.descripcion ?? undefined,
      kmIntervalo: parsed.data.kmIntervalo ?? undefined,
      diasIntervalo: parsed.data.diasIntervalo ?? undefined,
    },
  });

  return NextResponse.json({ data: plan });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  await prisma.planMantenimiento.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
