import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { calcularCostoMantenimientoMensual } from "@/lib/services/costo-mecanico";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const marca = req.nextUrl.searchParams.get("marca");
  const modelo = req.nextUrl.searchParams.get("modelo");

  if (!marca || !modelo) {
    return NextResponse.json(
      { error: "Parámetros marca y modelo requeridos" },
      { status: 400 }
    );
  }

  const result = await calcularCostoMantenimientoMensual(marca, modelo);

  return NextResponse.json({ data: result });
}
