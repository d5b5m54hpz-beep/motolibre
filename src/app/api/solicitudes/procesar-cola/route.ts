import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { procesarAsignacionesPendientes } from "@/lib/asignacion-utils";

export async function POST(_req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.solicitud.assignMoto,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const asignaciones = await procesarAsignacionesPendientes(userId ?? undefined);

  return NextResponse.json({
    data: {
      asignaciones,
      total: asignaciones.length,
      mensaje:
        asignaciones.length > 0
          ? `${asignaciones.length} moto(s) asignada(s) automáticamente`
          : "No hay motos disponibles para las solicitudes en espera",
    },
  });
}
