import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const requestSchema = z.object({
  tareas: z
    .array(
      z.object({
        descripcion: z.string(),
        categoria: z.string(),
        accion: z.string(),
      })
    )
    .min(1),
  marcaMoto: z.string().optional(),
  modeloMoto: z.string().optional(),
});

function isAIConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isAIConfigured()) {
    return NextResponse.json({ data: [], aiAvailable: false });
  }

  // Get active repuestos catalog for the AI to pick from
  const repuestos = await prisma.repuesto.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      unidad: true,
      precioCompra: true,
    },
    take: 200,
    orderBy: { nombre: "asc" },
  });

  const catalogoText = repuestos
    .map(
      (r) =>
        `- ID: ${r.id} | ${r.nombre}${r.codigo ? ` (${r.codigo})` : ""} | ${r.unidad ?? "unidad"} | $${r.precioCompra ?? "N/A"}`
    )
    .join("\n");

  const tareasText = parsed.data.tareas
    .map(
      (t, i) =>
        `${i + 1}. [${t.categoria}] ${t.descripcion} (acción: ${t.accion})`
    )
    .join("\n");

  const motoContext =
    parsed.data.marcaMoto && parsed.data.modeloMoto
      ? `La moto es una ${parsed.data.marcaMoto} ${parsed.data.modeloMoto}.`
      : "";

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: `Sos un mecánico experto en motos que trabaja en MotoLibre, empresa de alquiler de motos en Buenos Aires.
Tu tarea es sugerir repuestos del catálogo para las tareas de mantenimiento indicadas.

REGLAS:
- SOLO sugerí repuestos que estén en el catálogo proporcionado
- Usá los IDs exactos del catálogo
- Sugerí cantidades razonables para cada repuesto
- Indicá tu nivel de confianza (0.0 a 1.0)
- Respondé SOLO con JSON válido (sin markdown, sin backticks)
- Si no encontrás repuestos relevantes para una tarea, no la incluyas

Formato de respuesta:
[
  {
    "tareaDescripcion": "nombre de la tarea",
    "repuestoId": "id del catálogo",
    "repuestoNombre": "nombre del repuesto",
    "cantidadSugerida": 1,
    "confianza": 0.85,
    "motivo": "breve explicación"
  }
]`,
      prompt: `${motoContext}

TAREAS DE MANTENIMIENTO:
${tareasText}

CATÁLOGO DE REPUESTOS DISPONIBLES:
${catalogoText}

Sugerí los repuestos necesarios para cada tarea.`,
      maxOutputTokens: 1000,
    });

    const suggestions = JSON.parse(text);

    if (!Array.isArray(suggestions)) {
      return NextResponse.json({ data: [], aiAvailable: true });
    }

    // Validate that suggested repuestoIds exist in our catalog
    const validIds = new Set(repuestos.map((r) => r.id));
    const validSuggestions = suggestions.filter(
      (s: { repuestoId?: string }) => s.repuestoId && validIds.has(s.repuestoId)
    );

    // Enrich with full repuesto data
    const repuestoMap = new Map(repuestos.map((r) => [r.id, r]));
    const data = validSuggestions.map(
      (s: {
        tareaDescripcion: string;
        repuestoId: string;
        cantidadSugerida?: number;
        confianza?: number;
        motivo?: string;
      }) => {
        const rep = repuestoMap.get(s.repuestoId)!;
        return {
          itemServiceId: "",
          itemServiceNombre: s.tareaDescripcion,
          repuestoId: rep.id,
          repuestoNombre: rep.nombre,
          repuestoCodigo: rep.codigo,
          repuestoPrecio: rep.precioCompra
            ? Number(rep.precioCompra)
            : null,
          repuestoUnidad: rep.unidad,
          repuestoStock: null,
          cantidadDefault: s.cantidadSugerida ?? 1,
          obligatorio: false,
          notas: s.motivo ?? null,
          origenIA: true,
          confianza: s.confianza ?? 0.5,
        };
      }
    );

    return NextResponse.json({ data, aiAvailable: true });
  } catch {
    return NextResponse.json({ data: [], aiAvailable: true });
  }
}
