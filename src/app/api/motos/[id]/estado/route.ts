import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { motoChangeStateSchema } from "@/lib/validations/moto";
import { esTransicionValida, estadosPosibles } from "@/lib/moto-transitions";
import type { EstadoMoto } from "@prisma/client";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.changeState,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = motoChangeStateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const moto = await prisma.moto.findUnique({ where: { id } });
  if (!moto) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
  }

  const { nuevoEstado, motivo } = parsed.data;

  if (!esTransicionValida(moto.estado, nuevoEstado as EstadoMoto)) {
    return NextResponse.json(
      {
        error: `Transición no permitida: ${moto.estado} → ${nuevoEstado}`,
        estadosPosibles: estadosPosibles(moto.estado),
      },
      { status: 422 }
    );
  }

  const updated = await withEvent(
    OPERATIONS.fleet.moto.changeState,
    "Moto",
    () =>
      prisma.$transaction(async (tx) => {
        await tx.historialEstadoMoto.create({
          data: {
            motoId: id,
            estadoAnterior: moto.estado,
            estadoNuevo: nuevoEstado as EstadoMoto,
            motivo,
            userId,
          },
        });

        return tx.moto.update({
          where: { id },
          data: {
            estado: nuevoEstado as EstadoMoto,
            estadoAnterior: moto.estado,
          },
        });
      }),
    userId,
    { estadoAnterior: moto.estado, estadoNuevo: nuevoEstado, motivo }
  );

  return NextResponse.json({ data: updated });
}
