import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { cambiarEstadoSchema } from "@/lib/validations/solicitud-taller";
import { eventBus } from "@/lib/events/event-bus";
import { OPERATIONS } from "@/lib/events/operations";
import { enviarNotificacionEstadoSolicitudTaller } from "@/lib/email";

const TRANSICIONES: Record<string, string[]> = {
  RECIBIDA: ["EN_EVALUACION", "INCOMPLETA"],
  INCOMPLETA: ["RECIBIDA"],
  EN_EVALUACION: ["APROBADA", "RECHAZADA", "EN_ESPERA"],
  EN_ESPERA: ["EN_EVALUACION", "APROBADA"],
  APROBADA: ["CONVENIO_ENVIADO"],
  CONVENIO_ENVIADO: ["CONVENIO_FIRMADO"],
  CONVENIO_FIRMADO: ["ONBOARDING"],
  ONBOARDING: ["ACTIVO"],
};

const ESTADO_LABELS: Record<string, string> = {
  RECIBIDA: "Recibida",
  EN_EVALUACION: "En Evaluación",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CONVENIO_ENVIADO: "Convenio Enviado",
};

const NOTIFY_STATES = ["RECIBIDA", "EN_EVALUACION", "APROBADA", "RECHAZADA", "CONVENIO_ENVIADO"];

/**
 * POST /api/solicitudes-taller/[id]/cambiar-estado
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
  const parsed = cambiarEstadoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { nuevoEstado, motivo } = parsed.data;
  const permitidos = TRANSICIONES[solicitud.estado] ?? [];

  if (!permitidos.includes(nuevoEstado)) {
    return NextResponse.json(
      {
        error: `No se puede cambiar de ${solicitud.estado} a ${nuevoEstado}`,
      },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = { estado: nuevoEstado };

  if (nuevoEstado === "RECHAZADA" && motivo) {
    updateData.motivoRechazo = motivo;
  }
  if (nuevoEstado === "EN_EVALUACION" && !solicitud.fechaEvaluacion) {
    updateData.fechaEvaluacion = new Date();
  }
  if (nuevoEstado === "APROBADA") {
    updateData.fechaAprobacion = new Date();
  }

  const updated = await prisma.solicitudTaller.update({
    where: { id },
    data: updateData,
  });

  // Emit event for timeline
  eventBus.emit(
    OPERATIONS.network.application.changeState,
    "solicitudTaller",
    id,
    { estadoAnterior: solicitud.estado, nuevoEstado, motivo }
  ).catch(() => {});

  // Send email notification (non-blocking)
  if (NOTIFY_STATES.includes(nuevoEstado)) {
    enviarNotificacionEstadoSolicitudTaller({
      to: solicitud.email,
      contactoNombre: solicitud.contactoNombre,
      nombreTaller: solicitud.nombreTaller,
      nuevoEstado,
      estadoLabel: ESTADO_LABELS[nuevoEstado] ?? nuevoEstado,
      mensaje: motivo ?? null,
      tokenPublico: solicitud.tokenPublico,
    }).catch((err) => {
      console.error("[cambiar-estado] Email failed:", err);
    });
  }

  return NextResponse.json({ data: updated });
}
