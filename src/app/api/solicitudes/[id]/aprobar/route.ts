import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.solicitud.approve,
    "canApprove",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const solicitud = await prisma.solicitud.findUnique({
    where: { id },
    include: { cliente: true },
  });

  if (!solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }
  if (solicitud.estado !== "PAGADA" && solicitud.estado !== "EN_EVALUACION") {
    return NextResponse.json(
      { error: `No se puede aprobar solicitud en estado ${solicitud.estado}` },
      { status: 422 }
    );
  }

  // Calcular posición en lista de espera
  const ultimaPrioridad = await prisma.solicitud.findFirst({
    where: {
      estado: { in: ["APROBADA", "EN_ESPERA"] },
      marcaDeseada: solicitud.marcaDeseada,
      modeloDeseado: solicitud.modeloDeseado,
    },
    orderBy: { prioridadEspera: "desc" },
    select: { prioridadEspera: true },
  });
  const nuevaPrioridad = (ultimaPrioridad?.prioridadEspera ?? 0) + 1;

  const updated = await withEvent(
    OPERATIONS.solicitud.approve,
    "Solicitud",
    () =>
      prisma.$transaction(async (tx) => {
        const s = await tx.solicitud.update({
          where: { id },
          data: {
            estado: "EN_ESPERA",
            evaluadoPor: userId,
            fechaEvaluacion: new Date(),
            prioridadEspera: nuevaPrioridad,
          },
        });

        // Aprobar cliente si aún no está aprobado
        if (solicitud.cliente.estado !== "APROBADO") {
          await tx.cliente.update({
            where: { id: solicitud.clienteId },
            data: {
              estado: "APROBADO",
              fechaAprobacion: new Date(),
              aprobadoPor: userId,
            },
          });
        }

        return s;
      }),
    userId,
    { prioridad: nuevaPrioridad }
  );

  return NextResponse.json({ data: updated });
}
