import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { enviarEmail, isResendConfigured } from "@/lib/services/email-service";
import { z } from "zod";

const bodySchema = z.object({
  textoEditado: z.string().min(1, "El texto editado es requerido"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.communication.message.approve,
    "canApprove",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "El texto editado es requerido" },
      { status: 400 }
    );
  }

  const aprobacion = await prisma.aprobacionMensaje.findUnique({
    where: { id },
    include: { mensaje: true },
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

  const mensaje = aprobacion.mensaje;

  // Update message body with edited version
  await prisma.mensajeComunicacion.update({
    where: { id: mensaje.id },
    data: { cuerpo: parsed.data.textoEditado },
  });

  // Send email with edited content
  if (isResendConfigured()) {
    const result = await enviarEmail({
      para: mensaje.para,
      cc: mensaje.cc,
      asunto: mensaje.asunto,
      html: parsed.data.textoEditado,
      texto: undefined,
      inReplyTo: mensaje.inReplyTo || undefined,
      replyTo: process.env.EMAIL_REPLY_TO,
    });

    if (result.error && !result.offline) {
      return NextResponse.json(
        { error: `Error al enviar: ${result.error}` },
        { status: 500 }
      );
    }

    await prisma.mensajeComunicacion.update({
      where: { id: mensaje.id },
      data: {
        estado: result.offline ? "APROBADO" : "ENVIADO",
        resendMessageId: result.id || null,
      },
    });
  } else {
    await prisma.mensajeComunicacion.update({
      where: { id: mensaje.id },
      data: { estado: "ENVIADO" },
    });
  }

  await prisma.aprobacionMensaje.update({
    where: { id },
    data: {
      estado: "EDITADO",
      aprobadoPor: session?.user?.id,
      textoEditado: parsed.data.textoEditado,
      fechaAprobacion: new Date(),
    },
  });

  return NextResponse.json({ data: { editadoYEnviado: true } });
}
