import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.client.approve,
    "canApprove",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  if (cliente.estado !== "PENDIENTE" && cliente.estado !== "EN_REVISION") {
    return NextResponse.json(
      { error: `No se puede aprobar cliente en estado ${cliente.estado}` },
      { status: 422 }
    );
  }

  const updated = await withEvent(
    OPERATIONS.commercial.client.approve,
    "Cliente",
    () =>
      prisma.cliente.update({
        where: { id },
        data: {
          estado: "APROBADO",
          fechaAprobacion: new Date(),
          aprobadoPor: userId,
        },
      }),
    userId
  );

  return NextResponse.json({ data: updated });
}
