import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const bodySchema = z.object({
  comentario: z.string().min(1, "El comentario es requerido"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.communication.message.reject,
    "canApprove",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "El comentario es requerido" },
      { status: 400 }
    );
  }

  const aprobacion = await prisma.aprobacionMensaje.findUnique({
    where: { id },
  });

  if (!aprobacion) {
    return NextResponse.json(
      { error: "Aprobación no encontrada" },
      { status: 404 }
    );
  }

  if (aprobacion.estado !== "PENDIENTE") {
    return NextResponse.json(
      { error: "Esta aprobación ya fue procesada" },
      { status: 400 }
    );
  }

  // Return message to draft
  await prisma.mensajeComunicacion.update({
    where: { id: aprobacion.mensajeId },
    data: { estado: "BORRADOR" },
  });

  await prisma.aprobacionMensaje.update({
    where: { id },
    data: {
      estado: "RECHAZADO",
      aprobadoPor: session?.user?.id,
      comentario: parsed.data.comentario,
      fechaAprobacion: new Date(),
    },
  });

  return NextResponse.json({ data: { rechazado: true } });
}
