import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toolRegistry } from "../tool-registry";

// 10. resumen_financiero
toolRegistry.registerTool({
  name: "resumen_financiero",
  description:
    "Resumen financiero del mes: ingresos por pagos, egresos por gastos, resultado neto.",
  module: "finanzas",
  allowedRoles: ["ADMIN", "CONTADOR", "VIEWER"],
  parameters: z.object({
    mes: z.number().optional().describe("Mes (1-12). Default: mes actual"),
    anio: z.number().optional().describe("Año. Default: año actual"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const ahora = new Date();
    const mes = (params.mes as number) || ahora.getMonth() + 1;
    const anio = (params.anio as number) || ahora.getFullYear();
    const desde = new Date(anio, mes - 1, 1);
    const hasta = new Date(anio, mes, 1);

    const [ingresos, egresos] = await Promise.all([
      prisma.pagoMercadoPago.aggregate({
        where: {
          estado: "APROBADO",
          fechaPago: { gte: desde, lt: hasta },
        },
        _sum: { monto: true },
        _count: true,
      }),
      prisma.gasto.aggregate({
        where: {
          estado: "APROBADO",
          fecha: { gte: desde, lt: hasta },
        },
        _sum: { monto: true },
        _count: true,
      }),
    ]);

    const totalIngresos = Number(ingresos._sum.monto ?? 0);
    const totalEgresos = Number(egresos._sum.monto ?? 0);

    return {
      periodo: `${mes.toString().padStart(2, "0")}/${anio}`,
      ingresos: { total: totalIngresos, cantidadPagos: ingresos._count },
      egresos: { total: totalEgresos, cantidadGastos: egresos._count },
      resultadoNeto: totalIngresos - totalEgresos,
    };
  },
});

// 11. pagos_pendientes
toolRegistry.registerTool({
  name: "pagos_pendientes",
  description:
    "Lista pagos pendientes de aprobación en MercadoPago.",
  module: "finanzas",
  allowedRoles: ["ADMIN", "CONTADOR"],
  parameters: z.object({
    limit: z.number().default(20).describe("Máximo de resultados"),
  }),
  execute: async (params: Record<string, unknown>) => {
    return prisma.pagoMercadoPago.findMany({
      where: { estado: "PENDIENTE" },
      select: {
        tipo: true,
        monto: true,
        estado: true,
        mpStatus: true,
        createdAt: true,
        contratoId: true,
        cuotaId: true,
      },
      orderBy: { createdAt: "desc" },
      take: (params.limit as number) || 20,
    });
  },
});

// 12. gastos_del_mes
toolRegistry.registerTool({
  name: "gastos_del_mes",
  description:
    "Lista gastos del mes actual agrupados por categoría con totales.",
  module: "finanzas",
  allowedRoles: ["ADMIN", "CONTADOR", "VIEWER"],
  parameters: z.object({
    mes: z.number().optional().describe("Mes (1-12). Default: mes actual"),
    anio: z.number().optional().describe("Año. Default: año actual"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const ahora = new Date();
    const mes = (params.mes as number) || ahora.getMonth() + 1;
    const anio = (params.anio as number) || ahora.getFullYear();
    const desde = new Date(anio, mes - 1, 1);
    const hasta = new Date(anio, mes, 1);

    const gastos = await prisma.gasto.groupBy({
      by: ["categoria"],
      where: { fecha: { gte: desde, lt: hasta } },
      _sum: { monto: true },
      _count: true,
      orderBy: { _sum: { monto: "desc" } },
    });

    return gastos.map((g) => ({
      categoria: g.categoria,
      total: Number(g._sum.monto ?? 0),
      cantidad: g._count,
    }));
  },
});

// 13. cuotas_vencidas
toolRegistry.registerTool({
  name: "cuotas_vencidas",
  description:
    "Lista cuotas vencidas (fecha de vencimiento pasada y no pagadas).",
  module: "finanzas",
  allowedRoles: ["ADMIN", "CONTADOR", "COMERCIAL"],
  parameters: z.object({
    limit: z.number().default(20).describe("Máximo de resultados"),
  }),
  execute: async (params: Record<string, unknown>) => {
    return prisma.cuota.findMany({
      where: {
        estado: "PENDIENTE",
        fechaVencimiento: { lt: new Date() },
      },
      select: {
        numero: true,
        monto: true,
        fechaVencimiento: true,
        contrato: {
          select: {
            montoPeriodo: true,
            cliente: { select: { nombre: true, apellido: true } },
          },
        },
      },
      orderBy: { fechaVencimiento: "asc" },
      take: (params.limit as number) || 20,
    });
  },
});

// 14. tipo_cambio_actual
toolRegistry.registerTool({
  name: "tipo_cambio_actual",
  description:
    "Obtiene el tipo de cambio actual cacheado (USD, EUR, etc.).",
  module: "finanzas",
  allowedRoles: ["ADMIN", "CONTADOR", "OPERADOR", "VIEWER"],
  parameters: z.object({}),
  execute: async () => {
    return prisma.tipoCambioCache.findMany({
      select: {
        moneda: true,
        compra: true,
        venta: true,
        fecha: true,
        fuente: true,
      },
      orderBy: { moneda: "asc" },
    });
  },
});

// 15. anomalias_activas
toolRegistry.registerTool({
  name: "anomalias_activas",
  description:
    "Lista anomalías activas (NUEVA o EN_REVISION) con su severidad y tipo.",
  module: "finanzas",
  allowedRoles: ["ADMIN", "CONTADOR"],
  parameters: z.object({
    limit: z.number().default(15).describe("Máximo de resultados"),
  }),
  execute: async (params: Record<string, unknown>) => {
    return prisma.anomalia.findMany({
      where: { estado: { in: ["NUEVA", "EN_REVISION"] } },
      select: {
        tipo: true,
        severidad: true,
        estado: true,
        titulo: true,
        descripcion: true,
        valorDetectado: true,
        valorEsperado: true,
        createdAt: true,
      },
      orderBy: [{ severidad: "desc" }, { createdAt: "desc" }],
      take: (params.limit as number) || 15,
    });
  },
});
