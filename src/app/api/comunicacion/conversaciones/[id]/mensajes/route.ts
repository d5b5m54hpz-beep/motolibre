import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  direccion: z.enum(["SALIENTE", "INTERNO", "NOTA_IA"]),
  para: z.array(z.string().email()).optional(),
  cc: z.array(z.string().email()).optional(),
  asunto: z.string().min(1),
  cuerpo: z.string().min(1),
  cuerpoTexto: z.string().optional(),
  inReplyTo: z.string().optional(),
});

export async function GET(
  req: NextRequest,
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
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "50");

  const mensajes = await prisma.mensajeComunicacion.findMany({
    where: { conversacionId: id },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      adjuntos: true,
      aprobacion: true,
    },
  });

  return NextResponse.json({ data: mensajes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.communication.message.draft,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const conversacion = await prisma.conversacion.findUnique({
    where: { id },
    include: {
      contactos: { include: { contacto: true } },
    },
  });
  if (!conversacion) {
    return NextResponse.json(
      { error: "Conversación no encontrada" },
      { status: 404 }
    );
  }

  const emailFrom =
    process.env.EMAIL_FROM || "MotoLibre <equipo@motolibre.com.ar>";
  const emailsPara =
    parsed.data.para ||
    conversacion.contactos.map((cc) => cc.contacto.email);

  const mensaje = await prisma.mensajeComunicacion.create({
    data: {
      conversacionId: id,
      direccion: parsed.data.direccion,
      estado: parsed.data.direccion === "INTERNO" || parsed.data.direccion === "NOTA_IA"
        ? "ENVIADO"
        : "BORRADOR",
      de: emailFrom,
      para: emailsPara,
      cc: parsed.data.cc || [],
      asunto: parsed.data.asunto,
      cuerpo: parsed.data.cuerpo,
      cuerpoTexto: parsed.data.cuerpoTexto,
      inReplyTo: parsed.data.inReplyTo,
      userId: session?.user?.id,
    },
    include: { adjuntos: true, aprobacion: true },
  });

  // Update conversation timestamp
  await prisma.conversacion.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ data: mensaje }, { status: 201 });
}
