import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSetup } from "@/lib/api-helpers";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

/**
 * POST /api/ai/supply-analysis
 * Analyzes the supply chain replenishment needs using Claude Haiku.
 * Returns prioritized analysis with urgency classification per item.
 */
export async function POST(req: NextRequest) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!["ADMIN", "COMERCIAL", "OPERADOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const { sugerencias } = body as {
    sugerencias: Array<{
      repuestoId: string;
      codigo: string;
      nombre: string;
      categoria: string;
      stockActual: number;
      stockMinimo: number;
      cantidadSugerida: number;
    }>;
  };

  if (!sugerencias || sugerencias.length === 0) {
    return NextResponse.json({ error: "Sin datos de sugerencias" }, { status: 400 });
  }

  const prompt = `Sos un analista de supply chain de MotoLibre, empresa argentina de alquiler de motos.
Analizá la siguiente lista de repuestos que necesitan reposición y brindá un análisis accionable en español argentino.

REPUESTOS A REPONER (${sugerencias.length} ítems):
${sugerencias
  .map((s) => {
    const deficit = s.stockMinimo - s.stockActual;
    const ratio = s.stockMinimo > 0 ? Math.round((s.stockActual / s.stockMinimo) * 100) : 0;
    return `- [${s.categoria}] ${s.codigo} ${s.nombre}: stock ${s.stockActual}/${s.stockMinimo} (${ratio}% del mínimo), déficit: ${deficit}, sugerido reponer: ${s.cantidadSugerida}`;
  })
  .join("\n")}

Respondé con:
1. **Diagnóstico**: Estado general del inventario en 2 oraciones.
2. **Prioridad URGENTE**: Ítems críticos (stock = 0 o < 30% del mínimo) — listá max 5 con el motivo.
3. **Prioridad NORMAL**: Ítems que necesitan atención en los próximos días — máx 3.
4. **Observaciones**: Patrones por categoría (ej: "FRENOS está muy descuidada") — 2 observaciones.
5. **Acción recomendada**: 1 acción concreta inmediata.

Sé directo y accionable. Máximo 200 palabras.`;

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt,
    maxOutputTokens: 500,
  });

  // Build per-item priority map
  const prioridades: Record<string, "URGENTE" | "NORMAL" | "PUEDE_ESPERAR"> = {};
  for (const s of sugerencias) {
    const ratio = s.stockMinimo > 0 ? s.stockActual / s.stockMinimo : 1;
    if (s.stockActual === 0 || ratio < 0.3) {
      prioridades[s.repuestoId] = "URGENTE";
    } else if (ratio < 0.7) {
      prioridades[s.repuestoId] = "NORMAL";
    } else {
      prioridades[s.repuestoId] = "PUEDE_ESPERAR";
    }
  }

  return NextResponse.json({ data: { analysis: text, prioridades } });
}
