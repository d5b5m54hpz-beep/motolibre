import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { evaluacionSchema } from "@/lib/validations/solicitud-taller";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.network.application.evaluate,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const solicitud = await prisma.solicitudTaller.findUnique({ where: { id } });
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

  // Upsert each evaluation category
  await withEvent(
    OPERATIONS.network.application.evaluate,
    "SolicitudTaller",
    async () => {
      for (const ev of parsed.data.evaluaciones) {
        await prisma.evaluacionSolicitud.upsert({
          where: {
            solicitudId_categoria: {
              solicitudId: id,
              categoria: ev.categoria,
            },
          },
          create: {
            solicitudId: id,
            categoria: ev.categoria,
            puntaje: ev.puntaje,
            peso: ev.peso,
            observaciones: ev.observaciones,
            evaluadorId: userId,
          },
          update: {
            puntaje: ev.puntaje,
            peso: ev.peso,
            observaciones: ev.observaciones,
            evaluadorId: userId,
          },
        });
      }

      // Recalculate weighted score
      const allEvals = await prisma.evaluacionSolicitud.findMany({
        where: { solicitudId: id },
      });

      let totalPonderado = 0;
      let totalPeso = 0;
      for (const e of allEvals) {
        totalPonderado += e.puntaje * e.peso;
        totalPeso += e.peso;
      }

      const scoreTotal = totalPeso > 0 ? totalPonderado / totalPeso : 0;

      return prisma.solicitudTaller.update({
        where: { id },
        data: {
          scoreTotal: Math.round(scoreTotal * 100) / 100,
          fechaEvaluacion: new Date(),
        },
      });
    },
    userId
  );

  const updated = await prisma.solicitudTaller.findUnique({
    where: { id },
    include: { evaluaciones: { orderBy: { categoria: "asc" } } },
  });

  return NextResponse.json({ data: updated });
}
