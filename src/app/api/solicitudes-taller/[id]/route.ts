import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

/**
 * GET /api/solicitudes-taller/[id]
 * Detalle completo de una solicitud (admin).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { id } = await params;

  const solicitud = await prisma.solicitudTaller.findUnique({
    where: { id },
    include: {
      evaluaciones: {
        orderBy: { categoria: "asc" },
      },
      convenio: true,
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
