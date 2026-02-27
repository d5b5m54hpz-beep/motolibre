import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { evaluacionSchema } from "@/lib/validations/solicitud-taller";
import { eventBus } from "@/lib/events/event-bus";
import { OPERATIONS } from "@/lib/events/operations";

/**
 * POST /api/solicitudes-taller/[id]/evaluar
 * Guarda evaluación por categorías y calcula score total.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { id } = await params;

  const solicitud = await prisma.solicitudTaller.findUnique({
    where: { id },
  });

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const parsed = evaluacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { evaluaciones } = parsed.data;
  let scoreTotal = 0;

  await prisma.$transaction(async (tx) => {
    for (const ev of evaluaciones) {
      await tx.evaluacionSolicitud.upsert({
        where: {
          solicitudId_categoria: {
            solicitudId: id,
            categoria: ev.categoria,
          },
        },
        update: {
          puntaje: ev.puntaje,
          peso: ev.peso,
          observaciones: ev.observaciones ?? null,
        },
        create: {
          solicitudId: id,
          categoria: ev.categoria,
          puntaje: ev.puntaje,
          peso: ev.peso,
          observaciones: ev.observaciones ?? null,
        },
      });
    }

    const allEvals = await tx.evaluacionSolicitud.findMany({
      where: { solicitudId: id },
    });

    const totalPeso = allEvals.reduce((sum, e) => sum + e.peso, 0);
    const totalPonderado = allEvals.reduce(
      (sum, e) => sum + e.puntaje * e.peso,
      0
    );
    scoreTotal = totalPeso > 0 ? totalPonderado / totalPeso : 0;

    await tx.solicitudTaller.update({
      where: { id },
      data: { scoreTotal },
    });
  });

  eventBus.emit(
    OPERATIONS.network.application.evaluate,
    "solicitudTaller",
    id,
    { scoreTotal, evaluaciones: evaluaciones.length }
  ).catch(() => {});

  return NextResponse.json({ success: true });
}
