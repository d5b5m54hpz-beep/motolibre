import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

interface EnviarEmailParams {
  para: string[];
  cc?: string[];
  asunto: string;
  html: string;
  texto?: string;
  inReplyTo?: string;
  replyTo?: string;
}

interface EnviarEmailResult {
  id: string;
  error?: string;
  offline?: boolean;
}

/**
 * Enviar email via Resend.
 * Si no hay API key configurada, retorna modo offline.
 */
export async function enviarEmail(
  params: EnviarEmailParams
): Promise<EnviarEmailResult> {
  const resend = getResend();

  if (!resend) {
    return { id: "", offline: true, error: "Resend no configurado (modo offline)" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "MotoLibre <equipo@motolibre.com.ar>",
      to: params.para,
      cc: params.cc,
      subject: params.asunto,
      html: params.html,
      text: params.texto,
      replyTo: params.replyTo || process.env.EMAIL_REPLY_TO,
      headers: params.inReplyTo
        ? { "In-Reply-To": params.inReplyTo }
        : undefined,
    });

    if (error) {
      return { id: "", error: error.message };
    }

    return { id: data?.id || "" };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido al enviar email";
    return { id: "", error: message };
  }
}

/**
 * Verifica si Resend está configurado.
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
