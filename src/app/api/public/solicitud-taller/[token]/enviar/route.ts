import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

/**
 * POST /api/public/solicitud-taller/[token]/enviar
 * Transición BORRADOR → RECIBIDA (enviar solicitud para revisión).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  apiSetup();
  const { token } = await params;

  const solicitud = await prisma.solicitudTaller.findUnique({
    where: { tokenPublico: token },
  });

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  if (!["BORRADOR", "INCOMPLETA"].includes(solicitud.estado)) {
    return NextResponse.json(
      { error: "Solo se puede enviar desde estado BORRADOR o INCOMPLETA" },
      { status: 400 }
    );
  }

  // Validate minimum required fields
  if (
    !solicitud.nombreTaller ||
    !solicitud.direccion ||
    !solicitud.ciudad ||
    !solicitud.provincia ||
    !solicitud.telefono ||
    !solicitud.email ||
    !solicitud.contactoNombre
  ) {
    return NextResponse.json(
      { error: "Faltan campos requeridos para enviar la solicitud" },
      { status: 400 }
    );
  }

  const updated = await prisma.solicitudTaller.update({
    where: { tokenPublico: token },
    data: {
      estado: "RECIBIDA",
      fechaRecepcion: new Date(),
    },
    select: {
      id: true,
      tokenPublico: true,
      estado: true,
      nombreTaller: true,
      fechaRecepcion: true,
    },
  });

  return NextResponse.json({ data: updated });
}
