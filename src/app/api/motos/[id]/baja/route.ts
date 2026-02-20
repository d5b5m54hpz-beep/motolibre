import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { motoBajaSchema } from "@/lib/validations/moto";
import type { TipoBaja } from "@prisma/client";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.decommission,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = motoBajaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const moto = await prisma.moto.findUnique({ where: { id } });
  if (!moto) {
    return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
  }

  if (moto.estado === "BAJA_DEFINITIVA" || moto.estado === "TRANSFERIDA") {
    return NextResponse.json({ error: "Moto ya dada de baja" }, { status: 422 });
  }

  const result = await withEvent(
    OPERATIONS.fleet.moto.decommission,
    "Moto",
    () =>
      prisma.$transaction(async (tx) => {
        await tx.bajaMoto.create({
          data: {
            motoId: id,
            tipo: parsed.data.tipo as TipoBaja,
            motivo: parsed.data.motivo,
            montoRecuperado: parsed.data.montoRecuperado ?? undefined,
            numDenuncia: parsed.data.numDenuncia,
            userId,
          },
        });

        await tx.historialEstadoMoto.create({
          data: {
            motoId: id,
            estadoAnterior: moto.estado,
            estadoNuevo: "BAJA_DEFINITIVA",
            motivo: `Baja: ${parsed.data.tipo} — ${parsed.data.motivo}`,
            userId,
          },
        });

        return tx.moto.update({
          where: { id },
          data: {
            estado: "BAJA_DEFINITIVA",
            estadoAnterior: moto.estado,
          },
        });
      }),
    userId,
    { tipoBaja: parsed.data.tipo }
  );

  return NextResponse.json({ data: result });
}
