import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { enviarEmail, isResendConfigured } from "@/lib/services/email-service";
import { crearAlerta } from "@/lib/alertas-utils";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.communication.message.submitApproval,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const mensaje = await prisma.mensajeComunicacion.findUnique({
    where: { id },
    include: { conversacion: true },
  });

  if (!mensaje) {
    return NextResponse.json(
      { error: "Mensaje no encontrado" },
      { status: 404 }
    );
  }

  if (mensaje.direccion !== "SALIENTE") {
    return NextResponse.json(
      { error: "Solo se pueden enviar mensajes salientes" },
      { status: 400 }
    );
  }

  // Check if user is ADMIN (CEO) — can send directly
  const isAdmin = session?.user?.role === "ADMIN";

  if (isAdmin) {
    // Send directly
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
        await prisma.mensajeComunicacion.update({
          where: { id },
          data: { estado: "FALLIDO" },
        });
        return NextResponse.json(
          { error: `Error al enviar: ${result.error}` },
          { status: 500 }
        );
      }

      await prisma.mensajeComunicacion.update({
        where: { id },
        data: {
          estado: result.offline ? "BORRADOR" : "ENVIADO",
          resendMessageId: result.id || null,
        },
      });
    } else {
      // Offline mode — mark as sent (saved in DB)
      await prisma.mensajeComunicacion.update({
        where: { id },
        data: { estado: "ENVIADO" },
      });
    }

    return NextResponse.json({ data: { enviado: true } });
  }

  // Non-admin: submit for approval
  await prisma.mensajeComunicacion.update({
    where: { id },
    data: { estado: "PENDIENTE_APROBACION" },
  });

  await prisma.aprobacionMensaje.create({
    data: {
      mensajeId: id,
      estado: "PENDIENTE",
    },
  });

  // Create alert for admin
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admin) {
    crearAlerta({
      tipo: "SISTEMA",
      titulo: "Mensaje pendiente de aprobación",
      mensaje: `Nuevo mensaje para aprobar: "${mensaje.asunto}"`,
      prioridad: "MEDIA",
      modulo: "comunicacion",
      entidadTipo: "MensajeComunicacion",
      entidadId: id,
      usuarioId: admin.id,
      accionUrl: "/admin/comunicacion/aprobaciones",
      accionLabel: "Ver aprobaciones",
    });
  }

  return NextResponse.json({ data: { pendienteAprobacion: true } });
}
