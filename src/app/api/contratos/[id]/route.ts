import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.commercial.contract.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      cliente: true,
      moto: true,
      cuotas: { orderBy: { numero: "asc" } },
      contratoAnterior: { select: { id: true } },
      contratosRenovados: { select: { id: true } },
    },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  const cuotasResumen = {
    total: contrato.cuotas.length,
    pagadas: contrato.cuotas.filter((c) => c.estado === "PAGADA").length,
    pendientes: contrato.cuotas.filter((c) => c.estado === "PENDIENTE").length,
    vencidas: contrato.cuotas.filter((c) => c.estado === "VENCIDA").length,
    montoPagado: contrato.cuotas
      .filter((c) => c.estado === "PAGADA")
      .reduce((sum, c) => sum + Number(c.montoPagado ?? c.monto), 0),
    montoPendiente: contrato.cuotas
      .filter((c) => c.estado === "PENDIENTE" || c.estado === "VENCIDA")
      .reduce((sum, c) => sum + Number(c.monto), 0),
  };

  return NextResponse.json({ data: { ...contrato, cuotasResumen } });
}
