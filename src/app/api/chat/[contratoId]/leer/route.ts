import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enviarMensajesLeidos } from "@/lib/services/pusher-service";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ contratoId: string }> }
) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { contratoId } = await params;
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OPERADOR" || session.user.role === "CONTADOR";

  // Admin marca como leídos los mensajes de clientes, cliente marca los de admin
  const rolesOpuestos = isAdmin
    ? ["CLIENTE"]
    : ["ADMIN", "OPERADOR", "CONTADOR", "SISTEMA"];

  const updated = await prisma.mensajeChat.updateMany({
    where: {
      contratoId,
      leido: false,
      userRole: { in: rolesOpuestos },
    },
    data: {
      leido: true,
      fechaLeido: new Date(),
    },
  });

  await enviarMensajesLeidos(contratoId, session.user.id);

  return NextResponse.json({ data: { marcados: updated.count } });
}
