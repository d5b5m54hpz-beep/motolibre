import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSetup } from "@/lib/api-helpers";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

/**
 * POST /api/ai/morosidad-analysis
 * Analyzes the delinquency portfolio using Claude Haiku and returns insights.
 */
export async function POST(req: NextRequest) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!["ADMIN", "COMERCIAL", "CONTADOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const { resumen, aging, topClientes } = body;

  if (!resumen) {
    return NextResponse.json({ error: "Datos insuficientes" }, { status: 400 });
  }

  const prompt = `Sos un analista financiero de MotoLibre, empresa argentina de alquiler de motos.
Analizá la siguiente cartera de clientes en mora y brindá un análisis conciso en español argentino.

RESUMEN DE CARTERA:
- Total en mora: $${resumen.totalEnMora?.toLocaleString("es-AR") ?? "N/A"}
- Clientes afectados: ${resumen.clientesAfectados}
- Contratos en estado crítico (90+ días): ${resumen.contratosSuspendibles}
- Porcentaje de la cartera: ${resumen.porcentajeCartera}%

AGING REPORT:
- 1-30 días: ${aging?.d1_30?.count ?? 0} cuotas ($${aging?.d1_30?.monto?.toLocaleString("es-AR") ?? "0"})
- 31-60 días: ${aging?.d31_60?.count ?? 0} cuotas ($${aging?.d31_60?.monto?.toLocaleString("es-AR") ?? "0"})
- 61-90 días: ${aging?.d61_90?.count ?? 0} cuotas ($${aging?.d61_90?.monto?.toLocaleString("es-AR") ?? "0"})
- 90+ días: ${aging?.d90plus?.count ?? 0} cuotas ($${aging?.d90plus?.monto?.toLocaleString("es-AR") ?? "0"})

TOP CLIENTES EN MORA:
${
  topClientes
    ?.slice(0, 5)
    .map(
      (c: { clienteNombre: string; diasMaxVencido: number; montoTotal: number; riesgo: string; cuotasVencidas: number }) =>
        `- ${c.clienteNombre}: ${c.diasMaxVencido} días, $${c.montoTotal.toLocaleString("es-AR")}, riesgo ${c.riesgo}, ${c.cuotasVencidas} cuota(s) vencida(s)`
    )
    .join("\n") ?? "Sin datos"
}

Respondé con:
1. **Diagnóstico**: Estado general de la cartera (2-3 oraciones)
2. **Focos de riesgo**: Los 2-3 puntos más críticos
3. **Acciones recomendadas**: 3 acciones concretas y priorizadas

Sé conciso, directo y accionable. Máximo 250 palabras.`;

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt,
    maxOutputTokens: 500,
  });

  return NextResponse.json({ data: { analysis: text } });
}
