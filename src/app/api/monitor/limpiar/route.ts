import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { apiSetup } from "@/lib/api-helpers";
import { limpiarEventosAntiguos } from "@/lib/diagnostico";

export async function POST(_req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.monitor.cleanup,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  try {
    const eliminados = await limpiarEventosAntiguos();

    return NextResponse.json({
      data: { eliminados },
    });
  } catch (error: unknown) {
    console.error("Error limpiando eventos:", error);
    return NextResponse.json(
      { error: "Error al limpiar eventos antiguos" },
      { status: 500 }
    );
  }
}
