import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { crearPreferenciaCuota } from "@/lib/mp-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.commercial.contract.create,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const cuota = await prisma.cuota.findUnique({
    where: { id },
    include: {
      contrato: {
        include: {
          cliente: true,
          moto: true,
        },
      },
    },
  });

  if (!cuota) {
    return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
  }
  if (cuota.estado === "PAGADA") {
    return NextResponse.json({ error: "Cuota ya pagada" }, { status: 422 });
  }

  const mp = await crearPreferenciaCuota({
    cuotaId: cuota.id,
    contratoId: cuota.contratoId,
    numeroCuota: cuota.numero,
    clienteEmail: cuota.contrato.cliente.email,
    motoModelo: `${cuota.contrato.moto.marca} ${cuota.contrato.moto.modelo}`,
    monto: Number(cuota.monto),
  });

  return NextResponse.json({
    data: {
      linkPago: mp.initPoint,
      linkPagoSandbox: mp.sandboxInitPoint,
      preferenceId: mp.preferenceId,
    },
  });
}
