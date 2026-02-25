import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

/**
 * Generates a network code like "ML-CABA-001" based on the city.
 */
async function generarCodigoRed(provincia: string): Promise<string> {
  // Abbreviate province to 4 chars uppercase
  const abrev = provincia
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 4);

  const count = await prisma.taller.count({
    where: { codigoRed: { startsWith: `ML-${abrev}-` } },
  });

  const num = String(count + 1).padStart(3, "0");
  return `ML-${abrev}-${num}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.network.application.activate,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

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
      { error: "Solo se puede activar desde estado ONBOARDING" },
      { status: 400 }
    );
  }

  if (solicitud.tallerId) {
    return NextResponse.json(
      { error: "Ya existe un taller vinculado" },
      { status: 400 }
    );
  }

  const codigoRed = await generarCodigoRed(solicitud.provincia);

  const taller = await withEvent(
    OPERATIONS.network.application.activate,
    "SolicitudTaller",
    () =>
      prisma.$transaction(async (tx) => {
        const nuevoTaller = await tx.taller.create({
          data: {
            nombre: solicitud.nombreTaller,
            tipo: "EXTERNO",
            direccion: solicitud.direccion,
            telefono: solicitud.telefono,
            email: solicitud.email,
            contacto: solicitud.contactoNombre,
            especialidades: solicitud.especialidades,
            activo: true,
            tarifaHora: solicitud.convenio
              ? Number(solicitud.convenio.tarifaHoraBase)
              : null,
            codigoRed,
            capacidadOTMes: solicitud.capacidadOTMes,
            horariosAtencion: solicitud.horariosAtencion,
            latitud: solicitud.latitud,
            longitud: solicitud.longitud,
          },
        });

        await tx.solicitudTaller.update({
          where: { id },
          data: {
            tallerId: nuevoTaller.id,
            estado: "ACTIVO",
          },
        });

        return nuevoTaller;
      }),
    userId
  );

  return NextResponse.json({ data: taller }, { status: 201 });
}
