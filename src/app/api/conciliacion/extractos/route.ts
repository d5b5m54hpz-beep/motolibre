import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.import,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const cuentaBancariaId = searchParams.get("cuentaBancariaId");

  if (!cuentaBancariaId) {
    return NextResponse.json(
      { error: "cuentaBancariaId es requerido" },
      { status: 400 }
    );
  }

  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const conciliado = searchParams.get("conciliado");

  const where: Record<string, unknown> = { cuentaBancariaId };

  if (desde || hasta) {
    const fecha: Record<string, Date> = {};
    if (desde) fecha.gte = new Date(desde);
    if (hasta) fecha.lte = new Date(hasta);
    where.fecha = fecha;
  }

  if (conciliado !== null && conciliado !== undefined && conciliado !== "") {
    where.conciliado = conciliado === "true";
  }

  const [data, count] = await Promise.all([
    prisma.extractoBancario.findMany({
      where,
      orderBy: { fecha: "desc" },
    }),
    prisma.extractoBancario.count({ where }),
  ]);

  return NextResponse.json({ data, count });
}
