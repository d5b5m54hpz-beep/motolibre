import { prisma } from "@/lib/prisma";
import type { TipoMovimientoStock } from "@prisma/client";
import { eventBus, OPERATIONS } from "@/lib/events";

/**
 * Registra un movimiento de stock y actualiza el stock del repuesto.
 * Punto central — TODO movimiento de stock pasa por aquí.
 */
export async function registrarMovimiento(params: {
  repuestoId: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  descripcion?: string;
  costoUnitario?: number;
  referenciaTipo?: string;
  referenciaId?: string;
  userId?: string;
}) {
  const { repuestoId, tipo, cantidad, descripcion, costoUnitario, referenciaTipo, referenciaId, userId } = params;

  const repuesto = await prisma.repuesto.findUnique({ where: { id: repuestoId } });
  if (!repuesto) throw new Error(`Repuesto ${repuestoId} no encontrado`);

  const esEntrada = ["INGRESO", "AJUSTE_POSITIVO", "DEVOLUCION"].includes(tipo);
  const delta = esEntrada ? cantidad : -cantidad;
  const stockAnterior = repuesto.stock;
  const stockPosterior = stockAnterior + delta;

  if (stockPosterior < 0 && tipo !== "AJUSTE_NEGATIVO") {
    throw new Error(`Stock insuficiente. Actual: ${stockAnterior}, requiere: ${cantidad}`);
  }

  const [movimiento] = await prisma.$transaction([
    prisma.movimientoStock.create({
      data: {
        repuestoId,
        tipo,
        cantidad: delta,
        stockAnterior,
        stockPosterior,
        descripcion,
        costoUnitario,
        referenciaTipo,
        referenciaId,
        userId,
      },
    }),
    prisma.repuesto.update({
      where: { id: repuestoId },
      data: { stock: stockPosterior },
    }),
  ]);

  if (tipo === "AJUSTE_POSITIVO" || tipo === "AJUSTE_NEGATIVO") {
    await eventBus.emit(
      OPERATIONS.supply.inventory.adjustStock,
      "Repuesto",
      repuestoId,
      {
        tipo,
        cantidad: delta,
        monto: Math.abs(delta) * Number(costoUnitario || repuesto.precioCompra),
      },
      userId || "system",
    ).catch(() => {});
  }

  if (stockPosterior <= repuesto.stockMinimo && stockAnterior > repuesto.stockMinimo) {
    console.log(`[Stock] ⚠️ ALERTA: ${repuesto.nombre} (${repuesto.codigo}) stock bajo: ${stockPosterior} (mínimo: ${repuesto.stockMinimo})`);
  }

  return movimiento;
}

/**
 * Obtiene repuestos con stock bajo (stock <= stockMinimo).
 */
export async function getRepuestosStockBajo() {
  // Prisma can't compare two columns directly, use raw query
  return prisma.$queryRawUnsafe<Array<{
    id: string;
    codigo: string;
    nombre: string;
    stock: number;
    stockMinimo: number;
    categoria: string;
    proveedorId: string | null;
  }>>(
    `SELECT id, codigo, nombre, stock, "stockMinimo", categoria, "proveedorId"
     FROM repuestos
     WHERE stock <= "stockMinimo" AND activo = true
     ORDER BY (stock::float / NULLIF("stockMinimo", 0)::float) ASC`
  );
}

/**
 * Genera sugerencia de compra basada en stock bajo.
 */
export async function generarSugerenciaCompra() {
  const stockBajo = await getRepuestosStockBajo();

  return stockBajo.map((r) => ({
    repuestoId: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    stockActual: r.stock,
    stockMinimo: r.stockMinimo,
    cantidadSugerida: (r.stockMinimo * 2) - r.stock,
    categoria: r.categoria,
    proveedorId: r.proveedorId,
  }));
}
