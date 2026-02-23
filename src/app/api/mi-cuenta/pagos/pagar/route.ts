import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { pagarCuotaSchema } from "@/lib/validations/mi-cuenta";
import { crearPreferenciaCuota } from "@/lib/mp-service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = pagarCuotaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cliente = await prisma.cliente.findUnique({
    where: { userId: session.user.id },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 403 });
  }

  const cuota = await prisma.cuota.findUnique({
    where: { id: parsed.data.cuotaId },
    include: {
      contrato: {
        include: {
          moto: { select: { marca: true, modelo: true } },
        },
      },
    },
  });

  if (!cuota) {
    return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
  }

  // Verify cuota belongs to this client
  if (cuota.contrato.clienteId !== cliente.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (cuota.estado !== "PENDIENTE" && cuota.estado !== "VENCIDA") {
    return NextResponse.json({ error: "Esta cuota no se puede pagar" }, { status: 422 });
  }

  const mp = await crearPreferenciaCuota({
    cuotaId: cuota.id,
    contratoId: cuota.contratoId,
    numeroCuota: cuota.numero,
    clienteEmail: cliente.email,
    motoModelo: `${cuota.contrato.moto.marca} ${cuota.contrato.moto.modelo}`,
    monto: Number(cuota.monto),
    backUrls: {
      success: "/mi-cuenta/pagos/resultado?status=approved",
      failure: "/mi-cuenta/pagos/resultado?status=rejected",
      pending: "/mi-cuenta/pagos/resultado?status=pending",
    },
  });

  return NextResponse.json({
    data: {
      pagoUrl: mp.initPoint,
      sandboxUrl: mp.sandboxInitPoint,
      preferenceId: mp.preferenceId,
    },
  });
}
