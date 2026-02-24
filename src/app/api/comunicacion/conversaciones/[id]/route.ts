import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  estado: z.enum(["ABIERTA", "RESUELTA", "ARCHIVADA"]).optional(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  etiquetas: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.conversation.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const conversacion = await prisma.conversacion.findUnique({
    where: { id },
    include: {
      contactos: {
        include: {
          contacto: {
            select: { id: true, nombre: true, email: true, tipo: true },
          },
        },
      },
      mensajes: {
        orderBy: { createdAt: "asc" },
        include: {
          adjuntos: true,
          aprobacion: true,
        },
      },
    },
  });

  if (!conversacion) {
    return NextResponse.json(
      { error: "Conversación no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: conversacion });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Determine operation based on action
  let opId: string = OPERATIONS.communication.conversation.resolve;
  if (parsed.data.estado === "ARCHIVADA") {
    opId = OPERATIONS.communication.conversation.archive;
  } else if (parsed.data.estado === "ABIERTA") {
    opId = OPERATIONS.communication.conversation.reopen;
  }

  const { error } = await requirePermission(opId, "canExecute", [
    "ADMIN",
    "OPERADOR",
  ]);
  if (error) return error;

  const conversacion = await prisma.conversacion.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ data: conversacion });
}
