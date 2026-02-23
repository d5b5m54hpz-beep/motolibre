import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.anomaly.resolve,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const anomalia = await prisma.anomalia.findUnique({ where: { id } });
  if (!anomalia) {
    return NextResponse.json({ error: "Anomalía no encontrada" }, { status: 404 });
  }
  if (anomalia.estado !== "NUEVA") {
    return NextResponse.json({ error: "Solo anomalías nuevas pueden marcarse en revisión" }, { status: 400 });
  }

  const updated = await prisma.anomalia.update({
    where: { id },
    data: { estado: "EN_REVISION" },
  });

  return NextResponse.json({ data: updated });
}
