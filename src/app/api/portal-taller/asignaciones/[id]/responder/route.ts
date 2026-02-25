import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const responderSchema = z.object({
  accion: z.enum(["ACEPTAR", "RECHAZAR"]),
  motivoRechazo: z.string().optional().nullable(),
  precioEstimado: z.number().positive().optional().nullable(),
  tiempoEstimado: z.number().int().positive().optional().nullable(),
  notasTaller: z.string().optional().nullable(),
  confirmRepuestos: z.boolean().optional().nullable(),
});

/**
 * POST /api/portal-taller/asignaciones/[id]/responder
 * Accept or reject an OT assignment.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.user.role !== "TALLER_EXTERNO") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const taller = await prisma.taller.findUnique({
    where: { userId: session.user.id },
    select: { id: true, nombre: true },
  });

  if (!taller) {
    return NextResponse.json(
      { error: "Taller no encontrado" },
      { status: 404 }
    );
  }

  const { id } = await params;
  const asignacion = await prisma.asignacionOT.findUnique({ where: { id } });

  if (!asignacion) {
    return NextResponse.json(
      { error: "Asignación no encontrada" },
      { status: 404 }
    );
  }

  if (asignacion.tallerId !== taller.id) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  if (asignacion.estado !== "PENDIENTE") {
    return NextResponse.json(
      { error: "Esta asignación ya fue respondida" },
      { status: 400 }
    );
  }

  // Check SLA deadline
  if (new Date() > asignacion.fechaLimite) {
    await prisma.asignacionOT.update({
      where: { id },
      data: { estado: "EXPIRADA", fechaRespuesta: new Date() },
    });
    return NextResponse.json(
      { error: "El plazo para responder expiró" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = responderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { accion, motivoRechazo, precioEstimado, tiempoEstimado, notasTaller, confirmRepuestos } =
    parsed.data;

  if (accion === "ACEPTAR") {
    // Accept: update assignment + link taller to OT
    const updated = await prisma.$transaction(async (tx) => {
      const asig = await tx.asignacionOT.update({
        where: { id },
        data: {
          estado: "ACEPTADA",
          fechaRespuesta: new Date(),
          precioEstimado,
          tiempoEstimado,
          notasTaller,
          confirmRepuestos,
        },
      });

      // Assign taller to the OT
      await tx.ordenTrabajo.update({
        where: { id: asignacion.ordenTrabajoId },
        data: {
          tallerId: taller.id,
          tallerNombre: taller.nombre,
        },
      });

      return asig;
    });

    return NextResponse.json({ data: updated });
  } else {
    // Reject
    const updated = await prisma.asignacionOT.update({
      where: { id },
      data: {
        estado: "RECHAZADA",
        fechaRespuesta: new Date(),
        motivoRechazo,
      },
    });

    return NextResponse.json({ data: updated });
  }
}
