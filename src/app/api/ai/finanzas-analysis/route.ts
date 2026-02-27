import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSetup } from "@/lib/api-helpers";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

/**
 * POST /api/ai/finanzas-analysis
 * Generates a CFO-level financial analysis using Claude Haiku.
 */
export async function POST(req: NextRequest) {
  apiSetup();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!["ADMIN", "CONTADOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const body = await req.json();
  const { resumen, indicadores, er } = body as {
    resumen: {
      ingresosMes: number;
      ingresosMesAnterior: number;
      variacionIngresos: number;
      egresosMes: number;
      egresosMesAnterior: number;
      variacionEgresos: number;
      resultadoNeto: number;
      cuentasPorCobrar: number;
      cuentasPorPagar: number;
      saldoCaja: number;
      saldoMP: number;
      saldoBanco: number;
    };
    indicadores: {
      margenOperativo: number;
      tasaOcupacion: number;
      tasaMorosidad: number;
      ejecucionPresupuestaria: number;
      roi: number;
      margenNeto: number;
      diasPromedioCobro: number;
      desvioPresupuestario: number;
    };
    er: {
      ingresos: { alquiler: number; ventaMotos: number; repuestos: number; otros: number; total: number };
      costos: { total: number };
      gastos: { total: number };
      resultadoNeto: number;
    };
  };

  if (!resumen || !indicadores) {
    return NextResponse.json({ error: "Sin datos financieros" }, { status: 400 });
  }

  const saldoTotal = resumen.saldoCaja + resumen.saldoMP + resumen.saldoBanco;
  const variacionIngStr = resumen.variacionIngresos >= 0
    ? `+${resumen.variacionIngresos.toFixed(1)}%`
    : `${resumen.variacionIngresos.toFixed(1)}%`;
  const variacionEgStr = resumen.variacionEgresos >= 0
    ? `+${resumen.variacionEgresos.toFixed(1)}%`
    : `${resumen.variacionEgresos.toFixed(1)}%`;

  const prompt = `Sos el CFO de MotoLibre, empresa argentina de alquiler de motos. Analizá el estado financiero del mes y redactá un reporte ejecutivo en español argentino, directo y accionable.

DATOS DEL MES:
- Ingresos: $${resumen.ingresosMes.toLocaleString("es-AR")} (${variacionIngStr} vs mes anterior)
- Egresos: $${resumen.egresosMes.toLocaleString("es-AR")} (${variacionEgStr} vs mes anterior)
- Resultado Neto: $${resumen.resultadoNeto.toLocaleString("es-AR")}
- Saldo disponible: $${saldoTotal.toLocaleString("es-AR")} (Caja + MP + Banco)
- Cuentas por cobrar: $${resumen.cuentasPorCobrar.toLocaleString("es-AR")}
- Cuentas por pagar: $${resumen.cuentasPorPagar.toLocaleString("es-AR")}

INGRESOS POR FUENTE:
- Alquiler: $${er?.ingresos.alquiler.toLocaleString("es-AR") ?? "N/A"}
- Venta motos: $${er?.ingresos.ventaMotos.toLocaleString("es-AR") ?? "N/A"}
- Repuestos: $${er?.ingresos.repuestos.toLocaleString("es-AR") ?? "N/A"}
- Otros: $${er?.ingresos.otros.toLocaleString("es-AR") ?? "N/A"}

INDICADORES CLAVE:
- Margen operativo: ${indicadores.margenOperativo.toFixed(1)}%
- Margen neto: ${indicadores.margenNeto.toFixed(1)}%
- Ocupación flota: ${indicadores.tasaOcupacion.toFixed(1)}%
- Morosidad: ${indicadores.tasaMorosidad.toFixed(1)}%
- ROI: ${indicadores.roi.toFixed(1)}%
- Días promedio de cobro: ${indicadores.diasPromedioCobro.toFixed(0)} días
- Ejecución presupuestaria: ${indicadores.ejecucionPresupuestaria.toFixed(1)}%
- Desvío presupuestario: ${indicadores.desvioPresupuestario.toFixed(1)}%

Respondé con:
1. **Estado general**: Semáforo (🟢/🟡/🔴) + 2 oraciones con el diagnóstico del mes.
2. **Puntos positivos**: 2 máx, con cifras concretas.
3. **Alertas**: 2 máx, lo que requiere atención inmediata.
4. **Acción prioritaria**: 1 acción concreta para esta semana.

Máximo 180 palabras. Sin intro, directo al análisis.`;

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt,
    maxOutputTokens: 450,
  });

  return NextResponse.json({ data: { analysis: text } });
}
