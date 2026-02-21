import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.solicitud.evaluate,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const solicitud = await prisma.solicitud.findUnique({
    where: { id },
    include: {
      cliente: {
        include: {
          documentos: { orderBy: { createdAt: "desc" } },
          puntajes: true,
        },
      },
      moto: true,
      contrato: true,
    },
  });

  if (!solicitud) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: solicitud });
}
