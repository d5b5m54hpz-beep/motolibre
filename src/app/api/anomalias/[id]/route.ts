import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.anomaly.detect,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const anomalia = await prisma.anomalia.findUnique({ where: { id } });
  if (!anomalia) {
    return NextResponse.json({ error: "Anomalía no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: anomalia });
}
