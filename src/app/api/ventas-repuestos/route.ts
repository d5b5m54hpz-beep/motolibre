import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.sale.confirm,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const estado = sp.get("estado");
  const busqueda = sp.get("busqueda");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const page = parseInt(sp.get("page") || "1");
  const limit = parseInt(sp.get("limit") || "20");

  const where: Record<string, unknown> = {};

  if (estado && estado !== "all") {
    where.estado = estado;
  }

  if (busqueda) {
    where.OR = [
      { nombreCliente: { contains: busqueda, mode: "insensitive" } },
      { emailCliente: { contains: busqueda, mode: "insensitive" } },
    ];
  }

  if (desde || hasta) {
    const createdAt: Record<string, Date> = {};
    if (desde) createdAt.gte = new Date(desde);
    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setHours(23, 59, 59, 999);
      createdAt.lte = hastaDate;
    }
    where.createdAt = createdAt;
  }

  const [ordenes, total, totalOrdenes, pendientes, ingresoAgg] =
    await Promise.all([
      prisma.ordenVentaRepuesto.findMany({
        where,
        include: {
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ordenVentaRepuesto.count({ where }),
      prisma.ordenVentaRepuesto.count(),
      prisma.ordenVentaRepuesto.count({ where: { estado: "PAGADA" } }),
      prisma.ordenVentaRepuesto.aggregate({
        _sum: { total: true },
        where: { estado: { not: "CANCELADA" } },
      }),
    ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    ordenes,
    total,
    page,
    totalPages,
    stats: {
      total: totalOrdenes,
      pendientes,
      ingresoTotal: ingresoAgg._sum.total ?? 0,
    },
  });
}
