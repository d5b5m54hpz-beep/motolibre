import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.hr.absence.approve,
    "canApprove",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { estado, observaciones } = body as {
    estado: "APROBADA" | "RECHAZADA";
    observaciones?: string;
  };

  if (!["APROBADA", "RECHAZADA"].includes(estado)) {
    return NextResponse.json(
      { error: "Estado debe ser APROBADA o RECHAZADA" },
      { status: 400 }
    );
  }

  const ausencia = await prisma.ausencia.update({
    where: { id },
    data: {
      estado,
      observaciones: observaciones || undefined,
      aprobadoPor: session?.user?.id,
      fechaAprobacion: new Date(),
    },
    include: {
      empleado: { select: { nombre: true, apellido: true, legajo: true } },
    },
  });

  const { eventBus } = await import("@/lib/events/event-bus");
  const opId =
    estado === "APROBADA"
      ? OPERATIONS.hr.absence.approve
      : OPERATIONS.hr.absence.reject;
  await eventBus.emit(opId, "Ausencia", ausencia.id, { estado }, session?.user?.id);

  return NextResponse.json({ data: ausencia });
}
