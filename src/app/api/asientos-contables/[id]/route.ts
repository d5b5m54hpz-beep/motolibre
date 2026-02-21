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
    OPERATIONS.accounting.entry.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const asiento = await prisma.asientoContable.findUnique({
    where: { id },
    include: {
      lineas: {
        include: {
          cuenta: { select: { id: true, codigo: true, nombre: true, tipo: true } },
        },
        orderBy: { debe: "desc" }, // DEBE primero, luego HABER
      },
      periodo: { select: { id: true, nombre: true, cerrado: true } },
    },
  });

  if (!asiento) {
    return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: asiento });
}
