import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { empleadoSchema } from "@/lib/validations/rrhh";
import { proximoLegajo } from "@/lib/rrhh-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.hr.employee.create,
    "canView",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const departamento = searchParams.get("departamento");
  const estado = searchParams.get("estado");
  const busqueda = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (departamento) where.departamento = departamento;
  if (estado) where.estado = estado;
  if (busqueda) {
    where.OR = [
      { nombre: { contains: busqueda, mode: "insensitive" } },
      { apellido: { contains: busqueda, mode: "insensitive" } },
      { legajo: { contains: busqueda, mode: "insensitive" } },
    ];
  }

  const empleados = await prisma.empleado.findMany({
    where,
    include: {
      _count: { select: { ausencias: true, recibos: true } },
    },
    orderBy: { legajo: "asc" },
  });

  return NextResponse.json({ data: empleados });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.hr.employee.create,
    "canCreate",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = empleadoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fechaIngreso, fechaNacimiento, ...rest } = parsed.data;
  const legajo = await proximoLegajo();

  const empleado = await prisma.empleado.create({
    data: {
      ...rest,
      legajo,
      fechaIngreso: new Date(fechaIngreso),
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
    },
  });

  const { eventBus } = await import("@/lib/events/event-bus");
  await eventBus.emit(
    OPERATIONS.hr.employee.create,
    "Empleado",
    empleado.id,
    { legajo, nombre: empleado.nombre, apellido: empleado.apellido },
    session?.user?.id
  );

  return NextResponse.json({ data: empleado }, { status: 201 });
}
