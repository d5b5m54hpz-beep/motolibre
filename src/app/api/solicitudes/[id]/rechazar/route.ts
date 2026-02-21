import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { solicitudRejectSchema } from "@/lib/validations/solicitud";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.solicitud.reject,
    "canApprove",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = solicitudRejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const solicitud = await prisma.solicitud.findUnique({ where: { id } });
  if (!solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }
  if (solicitud.estado !== "PAGADA" && solicitud.estado !== "EN_EVALUACION") {
    return NextResponse.json(
      { error: `No se puede rechazar solicitud en estado ${solicitud.estado}` },
      { status: 422 }
    );
  }

  const updated = await withEvent(
    OPERATIONS.solicitud.reject,
    "Solicitud",
    () =>
      prisma.$transaction(async (tx) => {
        const s = await tx.solicitud.update({
          where: { id },
          data: {
            estado: "RECHAZADA",
            evaluadoPor: userId,
            fechaEvaluacion: new Date(),
            motivoRechazo: parsed.data.motivoRechazo,
          },
        });

        await tx.cliente.update({
          where: { id: solicitud.clienteId },
          data: {
            estado: "RECHAZADO",
            motivoRechazo: parsed.data.motivoRechazo,
          },
        });

        return s;
      }),
    userId,
    { motivo: parsed.data.motivoRechazo }
  );

  return NextResponse.json({ data: updated });
}
