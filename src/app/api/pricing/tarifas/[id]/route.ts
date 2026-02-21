import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { tarifaUpdateSchema } from "@/lib/validations/tarifa";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.pricing.rental.update,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = tarifaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.tarifaAlquiler.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Tarifa no encontrada" }, { status: 404 });
  }

  const tarifa = await withEvent(
    OPERATIONS.pricing.rental.update,
    "TarifaAlquiler",
    () =>
      prisma.tarifaAlquiler.update({
        where: { id },
        data: {
          ...parsed.data,
          precio: parsed.data.precio !== undefined ? parsed.data.precio : undefined,
          vigenciaDesde: parsed.data.vigenciaDesde ? new Date(parsed.data.vigenciaDesde) : undefined,
          vigenciaHasta: parsed.data.vigenciaHasta ? new Date(parsed.data.vigenciaHasta) : undefined,
        },
      }),
    userId
  );

  return NextResponse.json({ data: tarifa });
}
