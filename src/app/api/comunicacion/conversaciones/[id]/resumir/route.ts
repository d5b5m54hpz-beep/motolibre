import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { resumirConversacion } from "@/lib/services/ai-agent-service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.ai.summarize,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const conversacion = await prisma.conversacion.findUnique({
    where: { id },
    include: {
      mensajes: {
        orderBy: { createdAt: "asc" },
        where: { direccion: { in: ["ENTRANTE", "SALIENTE"] } },
        select: { de: true, cuerpo: true, createdAt: true },
      },
    },
  });

  if (!conversacion) {
    return NextResponse.json(
      { error: "Conversación no encontrada" },
      { status: 404 }
    );
  }

  const mensajesFormatted = conversacion.mensajes.map((m) => ({
    de: m.de,
    cuerpo: m.cuerpo,
    fecha: m.createdAt.toISOString(),
  }));

  const resumen = await resumirConversacion(mensajesFormatted);

  await prisma.conversacion.update({
    where: { id },
    data: { resumenIA: resumen },
  });

  return NextResponse.json({ data: { resumen } });
}
