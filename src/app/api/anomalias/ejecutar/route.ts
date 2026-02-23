import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { apiSetup } from "@/lib/api-helpers";
import { ejecutarDeteccionCompleta } from "@/lib/anomalias/detector";

export async function POST() {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.anomaly.detect,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const resultado = await ejecutarDeteccionCompleta(userId || undefined);

  return NextResponse.json({ data: resultado });
}
