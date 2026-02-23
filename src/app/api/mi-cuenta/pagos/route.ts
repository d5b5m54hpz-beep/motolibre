import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { contratoNumero } from "@/lib/contrato-display";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const cliente = await prisma.cliente.findUnique({
    where: { userId: session.user.id },
  });
  if (!cliente) {
    return NextResponse.json({ data: { contrato: null, cuotas: [] } });
  }

  const contrato = await prisma.contrato.findFirst({
    where: { clienteId: cliente.id, estado: "ACTIVO" },
    include: {
      moto: { select: { marca: true, modelo: true } },
      cuotas: { orderBy: { numero: "asc" } },
    },
  });

  if (!contrato) {
    return NextResponse.json({ data: { contrato: null, cuotas: [] } });
  }

  return NextResponse.json({
    data: {
      contrato: {
        id: contrato.id,
        numero: contratoNumero(contrato),
        motoLabel: `${contrato.moto.marca} ${contrato.moto.modelo}`,
        frecuencia: contrato.frecuenciaPago,
        montoCuota: Number(contrato.montoPeriodo),
      },
      cuotas: contrato.cuotas.map((c) => ({
        id: c.id,
        numero: c.numero,
        monto: Number(c.monto),
        fechaVencimiento: c.fechaVencimiento,
        fechaPago: c.fechaPago,
        estado: c.estado,
        montoPagado: c.montoPagado ? Number(c.montoPagado) : null,
      })),
    },
  });
}
