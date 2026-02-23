import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

function getPusher(): Pusher | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
    return null;
  }

  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER || "us2",
      useTLS: true,
    });
  }
  return pusherInstance;
}

export function isPusherConfigured(): boolean {
  return Boolean(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET);
}

export async function enviarMensajeChat(
  contratoId: string,
  mensaje: {
    id: string;
    userId: string;
    userName: string;
    userRole: string;
    texto: string;
    tipo: string;
    createdAt: string;
  }
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;

  try {
    await pusher.trigger(`contrato-${contratoId}`, "nuevo-mensaje", mensaje);
  } catch (error: unknown) {
    console.error("[Pusher] Error enviando mensaje:", error);
  }
}

export async function enviarTyping(contratoId: string, userName: string): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;

  try {
    await pusher.trigger(`contrato-${contratoId}`, "typing", { userName });
  } catch {
    // Ignorar errores de typing
  }
}

export async function enviarMensajesLeidos(contratoId: string, userId: string): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;

  try {
    await pusher.trigger(`contrato-${contratoId}`, "mensajes-leidos", { userId });
  } catch {
    // Ignorar
  }
}
