import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toolRegistry } from "../tool-registry";
import { generarSugerenciaCompra } from "@/lib/stock-utils";
import type { EstadoEmbarque } from "@prisma/client";

// 1. inventario_estado
toolRegistry.registerTool({
  name: "inventario_estado",
  description:
    "Resumen del estado actual del inventario de repuestos: total de ítems, valor total, items con stock bajo, y distribución por categoría.",
  module: "supply",
  allowedRoles: ["ADMIN", "COMERCIAL", "OPERADOR", "VIEWER"],
  parameters: z.object({}),
  execute: async () => {
    const [repuestos, dashboard] = await Promise.all([
      prisma.repuesto.findMany({
        where: { activo: true },
        select: { categoria: true, stock: true, stockMinimo: true, precioCompra: true },
      }),
      prisma.repuesto.aggregate({
        where: { activo: true },
        _count: { id: true },
        _sum: { stock: true },
      }),
    ]);

    const stockBajo = repuestos.filter((r) => r.stock <= r.stockMinimo).length;
    const valorTotal = repuestos.reduce(
      (sum, r) => sum + r.stock * Number(r.precioCompra),
      0
    );

    const porCategoria: Record<string, { cantidad: number; stockBajo: number }> = {};
    for (const r of repuestos) {
      const cat = r.categoria as string;
      if (!porCategoria[cat]) porCategoria[cat] = { cantidad: 0, stockBajo: 0 };
      porCategoria[cat]!.cantidad++;
      if (r.stock <= r.stockMinimo) porCategoria[cat]!.stockBajo++;
    }

    return {
      totalRepuestos: dashboard._count.id,
      stockTotalUnidades: dashboard._sum.stock ?? 0,
      stockBajo,
      valorInventarioARS: Math.round(valorTotal),
      porcentajeStockBajo:
        dashboard._count.id > 0
          ? Math.round((stockBajo / dashboard._count.id) * 100)
          : 0,
      distribucionPorCategoria: Object.entries(porCategoria)
        .map(([cat, d]) => ({ categoria: cat, ...d }))
        .sort((a, b) => b.stockBajo - a.stockBajo),
    };
  },
});

// 2. alertas_stock_bajo
toolRegistry.registerTool({
  name: "alertas_stock_bajo",
  description:
    "Lista los repuestos que están por debajo del stock mínimo, con la cantidad sugerida a reponer y el proveedor asignado.",
  module: "supply",
  allowedRoles: ["ADMIN", "COMERCIAL", "OPERADOR", "VIEWER"],
  parameters: z.object({
    limite: z
      .number()
      .default(20)
      .describe("Máximo de ítems a retornar (default 20)"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const sugerencias = await generarSugerenciaCompra();
    const limite = (params.limite as number) ?? 20;

    // Enrich with proveedor name
    const proveedorIds = [...new Set(sugerencias.filter((s) => s.proveedorId).map((s) => s.proveedorId!))];
    const proveedores = await prisma.proveedor.findMany({
      where: { id: { in: proveedorIds } },
      select: { id: true, nombre: true },
    });
    const provMap = new Map(proveedores.map((p) => [p.id, p.nombre]));

    return {
      totalAlertasStock: sugerencias.length,
      items: sugerencias.slice(0, limite).map((s) => ({
        codigo: s.codigo,
        nombre: s.nombre,
        categoria: s.categoria,
        stockActual: s.stockActual,
        stockMinimo: s.stockMinimo,
        deficit: s.stockMinimo - s.stockActual,
        cantidadSugerida: s.cantidadSugerida,
        proveedor: s.proveedorId ? (provMap.get(s.proveedorId) ?? "Sin proveedor") : "Sin proveedor",
      })),
    };
  },
});

// 3. ordenes_compra_pendientes
toolRegistry.registerTool({
  name: "ordenes_compra_pendientes",
  description:
    "Lista las órdenes de compra activas (BORRADOR, ENVIADA, CONFIRMADA) con su proveedor, monto y estado.",
  module: "supply",
  allowedRoles: ["ADMIN", "COMERCIAL", "OPERADOR", "VIEWER"],
  parameters: z.object({}),
  execute: async () => {
    const ocs = await prisma.ordenCompra.findMany({
      where: { estado: { in: ["BORRADOR", "ENVIADA", "CONFIRMADA"] } },
      include: {
        proveedor: { select: { nombre: true } },
        items: { select: { cantidad: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const resumen = {
      totalPendientes: ocs.length,
      enBorrador: ocs.filter((o) => o.estado === "BORRADOR").length,
      enviadas: ocs.filter((o) => o.estado === "ENVIADA").length,
      confirmadas: ocs.filter((o) => o.estado === "CONFIRMADA").length,
      montoTotalPendiente: Math.round(
        ocs.reduce((sum, o) => sum + Number(o.montoTotal), 0)
      ),
    };

    return {
      resumen,
      ordenes: ocs.map((o) => ({
        numero: o.numero,
        proveedor: o.proveedor.nombre,
        estado: o.estado,
        montoTotal: Number(o.montoTotal),
        moneda: o.moneda,
        cantidadItems: o.items.reduce((s, i) => s + i.cantidad, 0),
        fechaEmision: o.fechaEmision.toISOString().split("T")[0],
        fechaEntregaEstimada: o.fechaEntregaEstimada
          ? o.fechaEntregaEstimada.toISOString().split("T")[0]
          : null,
      })),
    };
  },
});

// 4. embarques_activos
toolRegistry.registerTool({
  name: "embarques_activos",
  description:
    "Lista los embarques de importación en curso con su estado, proveedor, FOB total en USD y fecha estimada de arribo.",
  module: "supply",
  allowedRoles: ["ADMIN", "COMERCIAL", "OPERADOR", "VIEWER"],
  parameters: z.object({}),
  execute: async () => {
    const estadosActivos: EstadoEmbarque[] = [
      "EN_TRANSITO",
      "EN_PUERTO",
      "EN_ADUANA",
      "DESPACHADO_PARCIAL",
      "DESPACHADO",
      "COSTOS_FINALIZADOS",
      "EN_RECEPCION",
    ];

    const embarques = await prisma.embarqueImportacion.findMany({
      where: { estado: { in: estadosActivos } },
      include: {
        items: { select: { cantidad: true } },
      },
      orderBy: { fechaEstimadaArribo: "asc" },
    });

    return {
      totalActivos: embarques.length,
      embarques: embarques.map((e) => ({
        numero: e.numero,
        proveedor: e.proveedorNombre,
        estado: e.estado,
        totalFOBusd: Number(e.totalFOB ?? 0),
        fechaEmbarque: e.fechaEmbarque?.toISOString().split("T")[0] ?? null,
        fechaEstimadaArribo: e.fechaEstimadaArribo?.toISOString().split("T")[0] ?? null,
        cantidadItems: e.items.reduce((s: number, i: { cantidad: number }) => s + i.cantidad, 0),
        puertoOrigen: e.puertoOrigen ?? null,
      })),
    };
  },
});

// 5. consumo_repuesto
toolRegistry.registerTool({
  name: "consumo_repuesto",
  description:
    "Analiza el historial de consumo (movimientos de egreso) de un repuesto en los últimos 90 días para estimar la demanda mensual y la cantidad óptima a reponer.",
  module: "supply",
  allowedRoles: ["ADMIN", "COMERCIAL", "OPERADOR"],
  parameters: z.object({
    codigoONombre: z
      .string()
      .describe("Código o nombre del repuesto a analizar"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const q = params.codigoONombre as string;

    const repuesto = await prisma.repuesto.findFirst({
      where: {
        activo: true,
        OR: [
          { codigo: { contains: q, mode: "insensitive" } },
          { nombre: { contains: q, mode: "insensitive" } },
        ],
      },
    });

    if (!repuesto) return { error: `No se encontró repuesto con "${q}"` };

    const desde = new Date();
    desde.setDate(desde.getDate() - 90);

    const movimientos = await prisma.movimientoStock.findMany({
      where: {
        repuestoId: repuesto.id,
        createdAt: { gte: desde },
      },
      orderBy: { createdAt: "asc" },
    });

    const egresos = movimientos.filter((m) =>
      ["EGRESO", "AJUSTE_NEGATIVO"].includes(m.tipo)
    );
    const ingresos = movimientos.filter((m) =>
      ["INGRESO", "AJUSTE_POSITIVO", "DEVOLUCION"].includes(m.tipo)
    );

    const totalEgresado = Math.abs(
      egresos.reduce((s, m) => s + m.cantidad, 0)
    );
    const totalIngresado = ingresos.reduce((s, m) => s + m.cantidad, 0);
    const consumoMensualPromedio = Math.round(totalEgresado / 3);
    const stockSeguridad = Math.ceil(consumoMensualPromedio * 0.5);
    const cantidadOptima = Math.max(
      consumoMensualPromedio * 2,
      repuesto.stockMinimo * 2 - repuesto.stock
    );

    return {
      repuesto: {
        codigo: repuesto.codigo,
        nombre: repuesto.nombre,
        categoria: repuesto.categoria,
        stockActual: repuesto.stock,
        stockMinimo: repuesto.stockMinimo,
      },
      analisis90dias: {
        totalMovimientos: movimientos.length,
        totalEgresado,
        totalIngresado,
        consumoMensualPromedio,
        stockSeguridad,
        cantidadOptimaReponer: cantidadOptima,
      },
    };
  },
});
