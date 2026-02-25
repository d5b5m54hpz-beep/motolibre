import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { cambiarEstadoSchema } from "@/lib/validations/solicitud-taller";
import { apiSetup } from "@/lib/api-helpers";

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.network.application.changeState,
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
  const parsed = cambiarEstadoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { nuevoEstado, motivo } = parsed.data;
  const transicionesValidas = TRANSICIONES[solicitud.estado] ?? [];

  if (!transicionesValidas.includes(nuevoEstado)) {
    return NextResponse.json(
      {
        error: `Transición ${solicitud.estado} → ${nuevoEstado} no permitida. Válidas: ${transicionesValidas.join(", ") || "ninguna"}`,
      },
      { status: 400 }
    );
  }

  const dataUpdate: Record<string, unknown> = { estado: nuevoEstado };

  if (nuevoEstado === "RECHAZADA" && motivo) {
    dataUpdate.motivoRechazo = motivo;
  }
  if (nuevoEstado === "APROBADA") {
    dataUpdate.fechaAprobacion = new Date();
  }
  if (nuevoEstado === "RECIBIDA" && !solicitud.fechaRecepcion) {
    dataUpdate.fechaRecepcion = new Date();
  }

  const updated = await withEvent(
    OPERATIONS.network.application.changeState,
    "SolicitudTaller",
    () =>
      prisma.solicitudTaller.update({
        where: { id },
        data: dataUpdate,
      }),
    userId
  );

  return NextResponse.json({ data: updated });
}
