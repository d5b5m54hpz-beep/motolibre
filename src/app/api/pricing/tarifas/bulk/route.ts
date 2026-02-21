import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { tarifaBulkCreateSchema } from "@/lib/validations/tarifa";

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.pricing.rental.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = tarifaBulkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { marca, modelo, condicion, tarifas } = parsed.data;

  // Desactivar tarifas anteriores del mismo modelo+condición
  await prisma.tarifaAlquiler.updateMany({
    where: { marca, modelo, condicion, activo: true },
    data: { activo: false, vigenciaHasta: new Date() },
  });

  // Crear nuevas
  const created = await prisma.tarifaAlquiler.createMany({
    data: tarifas.map((t) => ({
      marca,
      modelo,
      condicion,
      plan: t.plan,
      frecuencia: t.frecuencia,
      precio: t.precio,
      creadoPor: userId,
    })),
  });

  return NextResponse.json({ data: { count: created.count } }, { status: 201 });
}
