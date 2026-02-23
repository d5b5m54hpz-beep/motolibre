import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ausenciaSchema } from "@/lib/validations/rrhh";
import { calcularDiasHabiles } from "@/lib/rrhh-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.hr.absence.request,
    "canView",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const empleadoId = searchParams.get("empleadoId");
  const tipo = searchParams.get("tipo");
  const estado = searchParams.get("estado");

  const where: Record<string, unknown> = {};
  if (empleadoId) where.empleadoId = empleadoId;
  if (tipo) where.tipo = tipo;
  if (estado) where.estado = estado;

  const ausencias = await prisma.ausencia.findMany({
    where,
    include: {
      empleado: { select: { nombre: true, apellido: true, legajo: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: ausencias });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.hr.absence.request,
    "canCreate",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = ausenciaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fechaDesde, fechaHasta, ...rest } = parsed.data;
  const desde = new Date(fechaDesde);
  const hasta = new Date(fechaHasta);
  const diasHabiles = calcularDiasHabiles(desde, hasta);

  const ausencia = await prisma.ausencia.create({
    data: {
      ...rest,
      fechaDesde: desde,
      fechaHasta: hasta,
      diasHabiles,
    },
    include: {
      empleado: { select: { nombre: true, apellido: true, legajo: true } },
    },
  });

  const { eventBus } = await import("@/lib/events/event-bus");
  await eventBus.emit(
    OPERATIONS.hr.absence.request,
    "Ausencia",
    ausencia.id,
    { tipo: ausencia.tipo, diasHabiles },
    session?.user?.id
  );

  return NextResponse.json({ data: ausencia }, { status: 201 });
}
