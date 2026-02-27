import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { eventBus } from "@/lib/events/event-bus";
import { OPERATIONS } from "@/lib/events/operations";

/**
 * POST /api/solicitudes-taller/[id]/activar
 * Crea un Taller a partir de la solicitud y la pasa a ACTIVO.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { id } = await params;

  const solicitud = await prisma.solicitudTaller.findUnique({
    where: { id },
    include: { convenio: true },
  });

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  if (solicitud.estado !== "ONBOARDING") {
    return NextResponse.json(
      { error: "La solicitud debe estar en ONBOARDING para activar" },
      { status: 400 }
    );
  }

  if (solicitud.tallerId) {
    return NextResponse.json(
      { error: "Ya existe un taller vinculado a esta solicitud" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const taller = await tx.taller.create({
      data: {
        nombre: solicitud.nombreTaller,
        tipo: "EXTERNO",
        direccion: solicitud.direccion,
        telefono: solicitud.telefono,
        email: solicitud.email,
        contacto: solicitud.contactoNombre,
        especialidades: solicitud.especialidades,
        activo: true,
        capacidadOTMes: solicitud.capacidadOTMes,
        horariosAtencion: solicitud.horariosAtencion,
        latitud: solicitud.latitud,
        longitud: solicitud.longitud,
      },
    });

    const updated = await tx.solicitudTaller.update({
      where: { id },
      data: {
        estado: "ACTIVO",
        tallerId: taller.id,
      },
    });

    return { taller, solicitud: updated };
  });

  eventBus.emit(
    OPERATIONS.network.application.activate,
    "solicitudTaller",
    id,
    { tallerId: result.taller.id }
  ).catch(() => {});

  return NextResponse.json({ data: result });
}
