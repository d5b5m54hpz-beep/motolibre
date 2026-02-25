import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.pricing.rental.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const marca = sp.get("marca");
  const tipoAjuste = sp.get("tipoAjuste");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const tarifaId = sp.get("tarifaId");

  const where: Record<string, unknown> = {};

  if (tarifaId) {
    where.tarifaAlquilerId = tarifaId;
  }

  if (marca) {
    where.tarifaAlquiler = { marca };
  }

  if (tipoAjuste) {
    where.tipoAjuste = tipoAjuste;
  }

  if (desde || hasta) {
    const createdAt: Record<string, Date> = {};
    if (desde) createdAt.gte = new Date(desde);
    if (hasta) createdAt.lte = new Date(hasta);
    where.createdAt = createdAt;
  }

  const historial = await prisma.historialTarifa.findMany({
    where,
    include: {
      tarifaAlquiler: {
        select: {
          marca: true,
          modelo: true,
          condicion: true,
          plan: true,
          frecuencia: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ data: historial });
}
