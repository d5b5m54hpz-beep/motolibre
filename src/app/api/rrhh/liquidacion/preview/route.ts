import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { liquidacionSchema } from "@/lib/validations/rrhh";
import { calcularLiquidacion } from "@/lib/rrhh-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.hr.payroll.liquidate,
    "canView",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = liquidacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const preview = await calcularLiquidacion(parsed.data);
    return NextResponse.json({ data: preview });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de cálculo";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
