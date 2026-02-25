import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { convenioCreateSchema } from "@/lib/validations/solicitud-taller";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.network.agreement.create,
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

  if (!["APROBADA", "CONVENIO_ENVIADO"].includes(solicitud.estado)) {
    return NextResponse.json(
      { error: "Solo se puede generar convenio para solicitudes aprobadas" },
      { status: 400 }
    );
  }

  if (solicitud.convenioId) {
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

  const convenio = await withEvent(
    OPERATIONS.network.agreement.create,
    "ConvenioTaller",
    () =>
      prisma.$transaction(async (tx) => {
        const conv = await tx.convenioTaller.create({
          data: {
            tarifaHoraBase: parsed.data.tarifaHoraBase,
            margenRepuestos: parsed.data.margenRepuestos,
            plazoFacturaDias: parsed.data.plazoFacturaDias,
            fechaInicio: new Date(parsed.data.fechaInicio),
            fechaFin: parsed.data.fechaFin
              ? new Date(parsed.data.fechaFin)
              : null,
            renovacionAuto: parsed.data.renovacionAuto,
            zonaCobertura: parsed.data.zonaCobertura,
            otMaxMes: parsed.data.otMaxMes,
          },
        });

        await tx.solicitudTaller.update({
          where: { id },
          data: {
            convenioId: conv.id,
            estado: "CONVENIO_ENVIADO",
          },
        });

        return conv;
      }),
    userId
  );

  return NextResponse.json({ data: convenio }, { status: 201 });
}
