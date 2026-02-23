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
    return NextResponse.json({ data: { contratos: [] } });
  }

  const contratos = await prisma.contrato.findMany({
    where: { clienteId: cliente.id },
    orderBy: { createdAt: "desc" },
    include: {
      moto: { select: { marca: true, modelo: true, patente: true, imagenUrl: true } },
      _count: { select: { cuotas: true } },
    },
  });

  return NextResponse.json({
    data: {
      contratos: contratos.map((c) => ({
        id: c.id,
        numero: contratoNumero(c),
        estado: c.estado,
        frecuencia: c.frecuenciaPago,
        montoCuota: Number(c.montoPeriodo),
        fechaInicio: c.fechaInicio,
        fechaFin: c.fechaFin,
        esLeaseToOwn: c.esLeaseToOwn,
        totalCuotas: c._count.cuotas,
        moto: {
          marca: c.moto.marca,
          modelo: c.moto.modelo,
          patente: c.moto.patente ?? "—",
        },
      })),
    },
  });
}
