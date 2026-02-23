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
    OPERATIONS.system.diagnostico.execute,
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;

  const ejecucion = await prisma.diagnosticoEjecucion.findUnique({
    where: { id },
  });

  if (!ejecucion) {
    return NextResponse.json(
      { error: "Ejecución de diagnóstico no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: ejecucion });
}
