import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.hr.employee.create,
    "canView",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const { id } = await params;
  const empleado = await prisma.empleado.findUnique({
    where: { id },
    include: {
      ausencias: { orderBy: { createdAt: "desc" }, take: 30 },
      recibos: { orderBy: { createdAt: "desc" }, take: 24 },
      documentos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!empleado) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: empleado });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.hr.employee.update,
    "canCreate",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  // Convert date strings
  if (body.fechaIngreso) body.fechaIngreso = new Date(body.fechaIngreso);
  if (body.fechaNacimiento) body.fechaNacimiento = new Date(body.fechaNacimiento);
  if (body.fechaEgreso) body.fechaEgreso = new Date(body.fechaEgreso);

  const empleado = await prisma.empleado.update({
    where: { id },
    data: body,
  });

  const { eventBus } = await import("@/lib/events/event-bus");
  await eventBus.emit(
    OPERATIONS.hr.employee.update,
    "Empleado",
    empleado.id,
    { legajo: empleado.legajo },
    session?.user?.id
  );

  return NextResponse.json({ data: empleado });
}
