import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSetup } from "@/lib/api-helpers";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

/**
 * POST /api/ai/rrhh-analysis
 * HR manager analysis using Claude Haiku.
 */
export async function POST(req: NextRequest) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!["ADMIN", "RRHH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const { stats, ausenciasPendientes } = body as {
    stats: {
      empleadosActivos: number;
      masaSalarial: number;
      ausenciasEsteMes: number;
      costoTotalMes: number;
    };
    ausenciasPendientes: Array<{
      tipo: string;
      diasHabiles: number;
      empleado: { nombre: string; apellido: string };
    }>;
  };

  if (!stats) {
    return NextResponse.json({ error: "Sin datos de RRHH" }, { status: 400 });
  }

  const ausenciasTexto =
    ausenciasPendientes.length > 0
      ? ausenciasPendientes
          .slice(0, 5)
          .map(
            (a) =>
              `${a.empleado.apellido} ${a.empleado.nombre}: ${a.tipo} (${a.diasHabiles} días hábiles)`
          )
          .join(", ")
      : "ninguna pendiente";

  const costoPerCapita =
    stats.empleadosActivos > 0
      ? Math.round(stats.costoTotalMes / stats.empleadosActivos)
      : 0;

  const prompt = `Sos el responsable de RRHH de MotoLibre, empresa argentina de alquiler de motos. Analizá el estado del personal y redactá un informe ejecutivo breve en español argentino.

DATOS ACTUALES:
- Empleados activos: ${stats.empleadosActivos}
- Masa salarial bruta: $${stats.masaSalarial.toLocaleString("es-AR")}
- Costo total del mes (con cargas): $${stats.costoTotalMes.toLocaleString("es-AR")}
- Costo per cápita mensual: $${costoPerCapita.toLocaleString("es-AR")}
- Ausencias este mes: ${stats.ausenciasEsteMes}
- Ausencias pendientes de aprobación: ${ausenciasPendientes.length}
${ausenciasPendientes.length > 0 ? `- Detalle ausencias: ${ausenciasTexto}` : ""}

Respondé con:
1. **Estado general**: 1 oración con el pulso del equipo este mes.
2. **Costos laborales**: Evaluá el costo por empleado y tendencia (razonable/alto/bajo para el sector).
3. **Ausencias**: Comentá si el nivel es normal o hay señales de alerta.
4. **Acción recomendada**: 1 acción concreta de gestión del personal.

Máximo 150 palabras. Sin intro, directo.`;

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt,
    maxOutputTokens: 400,
  });

  return NextResponse.json({ data: { analysis: text } });
}
