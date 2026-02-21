import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.invoicing.invoice.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const tipo = sp.get("tipo");
  const estado = sp.get("estado");
  const clienteId = sp.get("clienteId");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const search = sp.get("search");

  const where: Prisma.FacturaWhereInput = {};

  if (tipo) where.tipo = tipo as Prisma.FacturaWhereInput["tipo"];
  if (estado) where.estado = estado as Prisma.FacturaWhereInput["estado"];
  if (clienteId) where.clienteId = clienteId;

  if (search) {
    where.OR = [
      { numeroCompleto: { contains: search, mode: "insensitive" } },
      { receptorNombre: { contains: search, mode: "insensitive" } },
      { receptorCuit: { contains: search } },
    ];
  }

  if (desde ?? hasta) {
    const fechaFilter: Prisma.DateTimeFilter<"Factura"> = {};
    if (desde) fechaFilter.gte = new Date(desde);
    if (hasta) fechaFilter.lte = new Date(hasta);
    where.fechaEmision = fechaFilter;
  }

  const data = await prisma.factura.findMany({
    where,
    orderBy: { fechaEmision: "desc" },
    take: 100,
  });

  return NextResponse.json({ data });
}
