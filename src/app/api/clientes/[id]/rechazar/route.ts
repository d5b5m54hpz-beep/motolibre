import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { clienteRejectSchema } from "@/lib/validations/cliente";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.commercial.client.reject,
    "canApprove",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = clienteRejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  if (cliente.estado !== "PENDIENTE" && cliente.estado !== "EN_REVISION") {
    return NextResponse.json(
      { error: `No se puede rechazar cliente en estado ${cliente.estado}` },
      { status: 422 }
    );
  }

  const updated = await withEvent(
    OPERATIONS.commercial.client.reject,
    "Cliente",
    () =>
      prisma.cliente.update({
        where: { id },
        data: {
          estado: "RECHAZADO",
          motivoRechazo: parsed.data.motivoRechazo,
        },
      }),
    userId,
    { motivoRechazo: parsed.data.motivoRechazo }
  );

  return NextResponse.json({ data: updated });
}
