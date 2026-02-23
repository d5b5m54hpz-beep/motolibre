import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.anomaly.resolve,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { resolucion } = body;

  if (!resolucion || typeof resolucion !== "string") {
    return NextResponse.json({ error: "Se requiere una resolución" }, { status: 400 });
  }

  const anomalia = await prisma.anomalia.findUnique({ where: { id } });
  if (!anomalia) {
    return NextResponse.json({ error: "Anomalía no encontrada" }, { status: 404 });
  }
  if (anomalia.estado === "RESUELTA" || anomalia.estado === "DESCARTADA") {
    return NextResponse.json({ error: "La anomalía ya fue cerrada" }, { status: 400 });
  }

  const updated = await prisma.anomalia.update({
    where: { id },
    data: {
      estado: "RESUELTA",
      resolucion,
      resueltoPor: userId,
      fechaResolucion: new Date(),
    },
  });

  return NextResponse.json({ data: updated });
}
