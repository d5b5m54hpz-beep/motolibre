import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

/**
 * GET /api/solicitudes-taller/[id]/actividad
 * Returns timeline of business events for a solicitud.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { id } = await params;

  const events = await prisma.businessEvent.findMany({
    where: {
      entityType: "solicitudTaller",
      entityId: id,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      operationId: true,
      payload: true,
      createdAt: true,
      status: true,
    },
  });

  return NextResponse.json({ data: events });
}
