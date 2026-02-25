import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { solicitudUpdateSchema } from "@/lib/validations/solicitud-taller";
import { apiSetup } from "@/lib/api-helpers";

/**
 * GET /api/public/solicitud-taller/[token]
 * Ver estado de solicitud por token público.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  apiSetup();
  const { token } = await params;

  const solicitud = await prisma.solicitudTaller.findUnique({
    where: { tokenPublico: token },
    select: {
      id: true,
      estado: true,
      nombreTaller: true,
      ciudad: true,
      provincia: true,
      contactoNombre: true,
      email: true,
      scoreTotal: true,
      motivoRechazo: true,
      fechaRecepcion: true,
      fechaAprobacion: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: solicitud });
}

/**
 * PUT /api/public/solicitud-taller/[token]
 * Actualizar borrador de solicitud.
 */
export async function PUT(
  req: NextRequest,
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
      { error: "Solo se puede editar en estado BORRADOR o INCOMPLETA" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = solicitudUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.solicitudTaller.update({
    where: { tokenPublico: token },
    data: parsed.data,
    select: {
      id: true,
      tokenPublico: true,
      estado: true,
      nombreTaller: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: updated });
}
