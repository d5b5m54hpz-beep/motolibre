import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { lecturaKmSchema } from "@/lib/validations/moto";
import type { FuenteKm } from "@prisma/client";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.update,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = lecturaKmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const moto = await prisma.moto.findUnique({ where: { id } });
  if (!moto) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
  }

  if (parsed.data.km < moto.km) {
    return NextResponse.json(
      { error: `KM no puede ser menor al actual (${moto.km})` },
      { status: 422 }
    );
  }

  const lectura = await prisma.$transaction(async (tx) => {
    const l = await tx.lecturaKm.create({
      data: {
        motoId: id,
        km: parsed.data.km,
        fuente: parsed.data.fuente as FuenteKm,
        notas: parsed.data.notas,
        userId,
      },
    });

    await tx.moto.update({
      where: { id },
      data: { km: parsed.data.km, kmUltimaLectura: new Date() },
    });

    return l;
  });

  return NextResponse.json({ data: lectura }, { status: 201 });
}
