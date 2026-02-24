import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

function isAIConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

interface AnalisisResult {
  urgencia: "BAJA" | "MEDIA" | "ALTA" | "URGENTE";
  acciones: string[];
  temas: string[];
  sentimiento: string;
  resumen: string;
}

/**
 * Analiza un mensaje entrante con IA (Claude).
 * Retorna: urgencia, acciones sugeridas, temas detectados, sentimiento.
 */
export async function analizarMensaje(params: {
  de: string;
  asunto: string;
  cuerpo: string;
  tipoContacto?: string;
}): Promise<AnalisisResult> {
  const fallback: AnalisisResult = {
    urgencia: "MEDIA",
    acciones: ["Revisar y responder"],
    temas: [params.asunto],
    sentimiento: "neutral",
    resumen: `Email de ${params.de} sobre: ${params.asunto}`,
  };

  if (!isAIConfigured()) return fallback;

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: `Sos un asistente que analiza emails corporativos de MotoLibre, empresa de alquiler de motos en Buenos Aires.
Analizá el email y respondé SOLO con un JSON válido (sin markdown, sin backticks) con esta estructura:
{
  "urgencia": "BAJA" | "MEDIA" | "ALTA" | "URGENTE",
  "acciones": ["acción sugerida 1", "acción 2"],
  "temas": ["tema 1", "tema 2"],
  "sentimiento": "neutral" | "positivo" | "negativo" | "urgente",
  "resumen": "resumen en 1-2 oraciones"
}`,
      prompt: `De: ${params.de}${params.tipoContacto ? ` (${params.tipoContacto})` : ""}
Asunto: ${params.asunto}

${params.cuerpo}`,
      maxOutputTokens: 500,
    });

    const parsed = JSON.parse(text) as AnalisisResult;
    return {
      urgencia: parsed.urgencia || "MEDIA",
      acciones: parsed.acciones || ["Revisar y responder"],
      temas: parsed.temas || [params.asunto],
      sentimiento: parsed.sentimiento || "neutral",
      resumen: parsed.resumen || fallback.resumen,
    };
  } catch (error: unknown) {
    console.error("[ai-agent] Error analizando mensaje:", error);
    return fallback;
  }
}

/**
 * Genera borrador de respuesta.
 */
export async function generarBorrador(params: {
  mensajeOriginal: { de: string; asunto: string; cuerpo: string };
  contexto?: string;
  plantilla?: string;
  tono?: string;
}): Promise<string> {
  const fallbackDraft = `Estimado/a,

Gracias por su mensaje. Estamos revisando su consulta y le responderemos a la brevedad.

Saludos cordiales,
Equipo MotoLibre`;

  if (!isAIConfigured()) return fallbackDraft;

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: `Sos un asistente de MotoLibre, empresa argentina de alquiler de motos en Buenos Aires.
Generá un borrador de respuesta profesional en español argentino (usá "usted" en comunicaciones formales).
El tono debe ser ${params.tono || "profesional y cordial"}.
NO uses markdown. Escribí texto plano con saltos de línea.
Firmá como "Equipo MotoLibre".
${params.plantilla ? `Usá esta plantilla como base: ${params.plantilla}` : ""}
${params.contexto ? `Contexto adicional: ${params.contexto}` : ""}`,
      prompt: `Generá una respuesta a este email:

De: ${params.mensajeOriginal.de}
Asunto: ${params.mensajeOriginal.asunto}

${params.mensajeOriginal.cuerpo}`,
      maxOutputTokens: 1000,
    });

    return text || fallbackDraft;
  } catch (error: unknown) {
    console.error("[ai-agent] Error generando borrador:", error);
    return fallbackDraft;
  }
}

/**
 * Resume una conversación completa.
 */
export async function resumirConversacion(
  mensajes: Array<{
    de: string;
    cuerpo: string;
    fecha: string;
  }>
): Promise<string> {
  if (!isAIConfigured()) return "Resumen no disponible (IA no configurada)";

  try {
    const timeline = mensajes
      .map((m) => `[${m.fecha}] ${m.de}: ${m.cuerpo.slice(0, 500)}`)
      .join("\n\n");

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system:
        "Resumí esta conversación de email corporativo en 2-3 oraciones en español. Sé conciso y mencioná los puntos clave.",
      prompt: timeline,
      maxOutputTokens: 300,
    });

    return text || "Resumen no disponible";
  } catch (error: unknown) {
    console.error("[ai-agent] Error resumiendo conversación:", error);
    return "Resumen no disponible";
  }
}
