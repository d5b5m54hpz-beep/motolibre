import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { ajusteStockSchema } from "@/lib/validations/repuesto";
import { registrarMovimiento } from "@/lib/stock-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = ajusteStockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tipo = parsed.data.cantidad > 0 ? "AJUSTE_POSITIVO" : "AJUSTE_NEGATIVO";

  try {
    const movimiento = await registrarMovimiento({
      repuestoId: id,
      tipo: tipo as "AJUSTE_POSITIVO" | "AJUSTE_NEGATIVO",
      cantidad: Math.abs(parsed.data.cantidad),
      descripcion: parsed.data.motivo,
      referenciaTipo: "Ajuste",
      userId: session?.user?.id,
    });

    return NextResponse.json({ data: movimiento }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al ajustar stock";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
