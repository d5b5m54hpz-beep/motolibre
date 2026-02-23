import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enviarMensajeChat } from "@/lib/services/pusher-service";
import { crearAlerta } from "@/lib/alertas-utils";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const enviarSchema = z.object({
  texto: z.string().min(1).max(2000),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contratoId: string }> }
) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { contratoId } = await params;
  const sp = req.nextUrl.searchParams;
  const cursor = sp.get("cursor");
  const limit = Math.min(Number(sp.get("limit") || "50"), 100);

  // Verificar acceso: admin ve todo, cliente solo su contrato
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OPERADOR" || session.user.role === "CONTADOR";
  if (!isAdmin) {
    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      select: { cliente: { select: { userId: true } } },
    });
    if (!contrato || contrato.cliente?.userId !== session.user.id) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
  }

  const mensajes = await prisma.mensajeChat.findMany({
    where: { contratoId },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor
      ? { cursor: { id: cursor }, skip: 1 }
      : {}),
  });

  const nextCursor = mensajes.length === limit ? mensajes[mensajes.length - 1]?.id : null;

  return NextResponse.json({ data: mensajes, nextCursor });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contratoId: string }> }
) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { contratoId } = await params;
  const body = await req.json();
  const parsed = enviarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Texto requerido (máx 2000 caracteres)" }, { status: 400 });
  }

  // Verificar acceso
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OPERADOR" || session.user.role === "CONTADOR";
  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    select: {
      id: true,
      creadoPor: true,
      cliente: { select: { userId: true, nombre: true, apellido: true } },
    },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  if (!isAdmin && contrato.cliente?.userId !== session.user.id) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const userRole = isAdmin ? (session.user.role || "ADMIN") : "CLIENTE";

  const mensaje = await prisma.mensajeChat.create({
    data: {
      contratoId,
      userId: session.user.id,
      userName: session.user.name || "Usuario",
      userRole,
      texto: parsed.data.texto,
      tipo: "texto",
    },
  });

  // Enviar via Pusher (real-time)
  await enviarMensajeChat(contratoId, {
    id: mensaje.id,
    userId: mensaje.userId,
    userName: mensaje.userName,
    userRole: mensaje.userRole,
    texto: mensaje.texto,
    tipo: mensaje.tipo,
    createdAt: mensaje.createdAt.toISOString(),
  });

  // Si es cliente enviando mensaje → alerta para admin/operador
  if (!isAdmin) {
    const adminId = contrato.creadoPor || (
      await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } })
    )?.id;

    if (adminId) {
      await crearAlerta({
        tipo: "MENSAJE_NUEVO",
        prioridad: "MEDIA",
        titulo: "Nuevo mensaje de cliente",
        mensaje: `${contrato.cliente?.nombre || "Cliente"} escribió en el chat`,
        modulo: "chat",
        entidadTipo: "Contrato",
        entidadId: contratoId,
        usuarioId: adminId,
        accionUrl: `/admin/chat?contrato=${contratoId}`,
        accionLabel: "Abrir chat",
      }).catch(() => {});
    }
  }

  return NextResponse.json({ data: mensaje }, { status: 201 });
}
