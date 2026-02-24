import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { enviarEmail, isResendConfigured } from "@/lib/services/email-service";

export async function POST(
  _req: NextRequest,
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

  // Send email
  if (isResendConfigured()) {
    const result = await enviarEmail({
      para: mensaje.para,
      cc: mensaje.cc,
      asunto: mensaje.asunto,
      html: mensaje.cuerpo,
      texto: mensaje.cuerpoTexto || undefined,
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
      estado: "APROBADO",
      aprobadoPor: session?.user?.id,
      fechaAprobacion: new Date(),
    },
  });

  return NextResponse.json({ data: { aprobado: true } });
}
