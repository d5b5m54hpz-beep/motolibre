import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { cambiarEstadoSchema } from "@/lib/validations/solicitud-taller";

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

  return NextResponse.json({ data: updated });
}
