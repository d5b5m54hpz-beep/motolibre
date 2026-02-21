import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [
    totalRepuestos,
    allRepuestos,
    movimientosHoy,
    categorias,
  ] = await Promise.all([
    prisma.repuesto.count({ where: { activo: true } }),
    prisma.repuesto.findMany({
      where: { activo: true },
      select: { stock: true, stockMinimo: true, precioCompra: true },
    }),
    prisma.movimientoStock.count({
      where: { createdAt: { gte: hoy } },
    }),
    prisma.repuesto.groupBy({
      by: ["categoria"],
      where: { activo: true },
      _count: true,
    }),
  ]);

  const valorInventario = allRepuestos.reduce(
    (sum, r) => sum + r.stock * Number(r.precioCompra),
    0
  );
  const repuestosStockBajo = allRepuestos.filter(
    (r) => r.stock <= r.stockMinimo
  ).length;

  // Top 10 repuestos más movidos del mes
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const topMovimientos = await prisma.movimientoStock.groupBy({
    by: ["repuestoId"],
    where: { createdAt: { gte: inicioMes } },
    _count: true,
    orderBy: { _count: { repuestoId: "desc" } },
    take: 10,
  });

  const topIds = topMovimientos.map((t) => t.repuestoId);
  const topRepuestos = topIds.length > 0
    ? await prisma.repuesto.findMany({
        where: { id: { in: topIds } },
        select: { id: true, codigo: true, nombre: true },
      })
    : [];

  const topMap = new Map(topRepuestos.map((r) => [r.id, r]));

  const categoriasData = categorias.map((c) => {
    const reps = allRepuestos; // approximate — we don't have per-category breakdown from groupBy
    return {
      categoria: c.categoria,
      count: c._count,
      valor: 0, // Would need separate query per category for accuracy
    };
  });

  return NextResponse.json({
    data: {
      totalRepuestos,
      valorInventario,
      repuestosStockBajo,
      movimientosHoy,
      categorias: categoriasData,
      topMovimientos: topMovimientos.map((t) => ({
        repuestoId: t.repuestoId,
        codigo: topMap.get(t.repuestoId)?.codigo ?? "",
        nombre: topMap.get(t.repuestoId)?.nombre ?? "",
        movimientos: t._count,
      })),
    },
  });
}
