import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { convenioCreateSchema } from "@/lib/validations/solicitud-taller";
import { eventBus } from "@/lib/events/event-bus";
import { OPERATIONS } from "@/lib/events/operations";

/**
 * POST /api/solicitudes-taller/[id]/generar-convenio
 * Crea un convenio comercial vinculado a la solicitud.
 */
export async function POST(
  req: NextRequest,
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

  if (!["APROBADA", "CONVENIO_ENVIADO"].includes(solicitud.estado)) {
    return NextResponse.json(
      { error: "La solicitud debe estar APROBADA para generar convenio" },
      { status: 400 }
    );
  }

  if (solicitud.convenio) {
    return NextResponse.json(
      { error: "Ya existe un convenio para esta solicitud" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = convenioCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const convenio = await tx.convenioTaller.create({
      data: {
        tarifaHoraBase: parsed.data.tarifaHoraBase,
        margenRepuestos: parsed.data.margenRepuestos ?? null,
        plazoFacturaDias: parsed.data.plazoFacturaDias,
        fechaInicio: new Date(parsed.data.fechaInicio),
        fechaFin: parsed.data.fechaFin
          ? new Date(parsed.data.fechaFin)
          : null,
        renovacionAuto: parsed.data.renovacionAuto,
        zonaCobertura: parsed.data.zonaCobertura ?? null,
        otMaxMes: parsed.data.otMaxMes ?? null,
      },
    });

    const updated = await tx.solicitudTaller.update({
      where: { id },
      data: {
        convenioId: convenio.id,
        estado: "CONVENIO_ENVIADO",
      },
    });

    return { convenio, solicitud: updated };
  });

  eventBus.emit(
    OPERATIONS.network.agreement.create,
    "solicitudTaller",
    id,
    { convenioId: result.convenio.id }
  ).catch(() => {});

  return NextResponse.json({ data: result });
}
