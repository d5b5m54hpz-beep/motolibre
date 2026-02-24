import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analizarMensaje } from "@/lib/services/ai-agent-service";
import { generarBorrador } from "@/lib/services/ai-agent-service";
import { crearAlerta } from "@/lib/alertas-utils";
import crypto from "crypto";

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification if no secret configured
  const hash = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("resend-signature") || "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let data: {
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    message_id?: string;
    in_reply_to?: string;
  };

  try {
    const payload = JSON.parse(rawBody);
    data = payload.data || payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const senderEmail = data.from
    .replace(/.*</, "")
    .replace(/>.*/, "")
    .trim()
    .toLowerCase();

  // Find or create contact
  let contacto = await prisma.contacto.findUnique({
    where: { email: senderEmail },
  });

  if (!contacto) {
    contacto = await prisma.contacto.create({
      data: {
        nombre: data.from.replace(/<.*>/, "").trim() || senderEmail,
        email: senderEmail,
        tipo: "OTRO",
      },
    });
  }

  // Find existing open conversation with this contact, or create new
  let conversacion = await prisma.conversacion.findFirst({
    where: {
      estado: "ABIERTA",
      contactos: { some: { contactoId: contacto.id } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversacion) {
    conversacion = await prisma.conversacion.create({
      data: {
        asunto: data.subject || "(Sin asunto)",
        contactos: {
          create: { contactoId: contacto.id },
        },
      },
    });
  }

  // Create inbound message
  const mensaje = await prisma.mensajeComunicacion.create({
    data: {
      conversacionId: conversacion.id,
      direccion: "ENTRANTE",
      estado: "ENTREGADO",
      de: data.from,
      para: data.to || [],
      asunto: data.subject || "(Sin asunto)",
      cuerpo: data.html || data.text || "",
      cuerpoTexto: data.text,
      messageId: data.message_id,
      inReplyTo: data.in_reply_to,
    },
  });

  // Update conversation timestamp
  await prisma.conversacion.update({
    where: { id: conversacion.id },
    data: { updatedAt: new Date() },
  });

  // AI analysis (async, don't block response)
  analizarMensaje({
    de: data.from,
    asunto: data.subject || "",
    cuerpo: data.text || data.html || "",
    tipoContacto: contacto.tipo,
  })
    .then(async (analisis) => {
      await prisma.mensajeComunicacion.update({
        where: { id: mensaje.id },
        data: { analisisIA: JSON.parse(JSON.stringify(analisis)) },
      });

      // Update conversation priority based on urgency
      if (analisis.urgencia === "URGENTE" || analisis.urgencia === "ALTA") {
        await prisma.conversacion.update({
          where: { id: conversacion!.id },
          data: { prioridad: analisis.urgencia },
        });
      }

      // Generate AI draft response
      const borrador = await generarBorrador({
        mensajeOriginal: {
          de: data.from,
          asunto: data.subject || "",
          cuerpo: data.text || data.html || "",
        },
      });

      // Save draft as NOTA_IA
      await prisma.mensajeComunicacion.create({
        data: {
          conversacionId: conversacion!.id,
          direccion: "NOTA_IA",
          estado: "ENVIADO",
          de: "IA Agent",
          para: [],
          asunto: `Re: ${data.subject || "(Sin asunto)"}`,
          cuerpo: `**Análisis IA:**\nUrgencia: ${analisis.urgencia}\nAcciones: ${analisis.acciones.join(", ")}\nResumen: ${analisis.resumen}`,
          borradorIA: borrador,
        },
      });
    })
    .catch((err) => {
      console.error("[webhook] Error en análisis IA:", err);
    });

  // Alert admin
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admin) {
    crearAlerta({
      tipo: "EMAIL_ENTRANTE",
      titulo: `Nuevo email de ${contacto.nombre}`,
      mensaje: data.subject || "(Sin asunto)",
      prioridad: "MEDIA",
      modulo: "comunicacion",
      entidadTipo: "Conversacion",
      entidadId: conversacion.id,
      usuarioId: admin.id,
      accionUrl: `/admin/comunicacion/conversaciones/${conversacion.id}`,
      accionLabel: "Ver conversación",
    });
  }

  return NextResponse.json({ received: true });
}
