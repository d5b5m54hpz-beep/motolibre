import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { generarSugerenciaCompra } from "@/lib/stock-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const sugerencias = await generarSugerenciaCompra();
  return NextResponse.json({ data: sugerencias });
}
