import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { generarBorrador } from "@/lib/services/ai-agent-service";
import { z } from "zod";

const bodySchema = z.object({
  contexto: z.string().optional(),
  plantillaId: z.string().optional(),
  tono: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.ai.draftResponse,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);

  const mensaje = await prisma.mensajeComunicacion.findUnique({
    where: { id },
  });

  if (!mensaje) {
    return NextResponse.json(
      { error: "Mensaje no encontrado" },
      { status: 404 }
    );
  }

  let plantillaTexto: string | undefined;
  if (parsed.success && parsed.data.plantillaId) {
    const plantilla = await prisma.plantillaMensaje.findUnique({
      where: { id: parsed.data.plantillaId },
    });
    if (plantilla) {
      plantillaTexto = plantilla.cuerpo;
    }
  }

  const borrador = await generarBorrador({
    mensajeOriginal: {
      de: mensaje.de,
      asunto: mensaje.asunto,
      cuerpo: mensaje.cuerpo,
    },
    contexto: parsed.success ? parsed.data.contexto : undefined,
    plantilla: plantillaTexto,
    tono: parsed.success ? parsed.data.tono : undefined,
  });

  // Save draft on the message
  await prisma.mensajeComunicacion.update({
    where: { id },
    data: { borradorIA: borrador },
  });

  return NextResponse.json({ data: { borrador } });
}
