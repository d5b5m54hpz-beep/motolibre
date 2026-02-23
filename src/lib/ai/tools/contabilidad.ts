import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toolRegistry } from "../tool-registry";

// 16. saldo_cuenta
toolRegistry.registerTool({
  name: "saldo_cuenta",
  description:
    "Obtiene el saldo actual de una cuenta contable por código o nombre.",
  module: "contabilidad",
  allowedRoles: ["ADMIN", "CONTADOR"],
  parameters: z.object({
    codigo: z.string().optional().describe("Código de la cuenta contable"),
    nombre: z.string().optional().describe("Nombre (búsqueda parcial) de la cuenta"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const where: Record<string, unknown> = {};
    if (params.codigo) where.codigo = params.codigo;
    if (params.nombre) where.nombre = { contains: params.nombre, mode: "insensitive" };

    const cuenta = await prisma.cuentaContable.findFirst({
      where,
      select: {
        codigo: true,
        nombre: true,
        tipo: true,
        activa: true,
        lineasAsiento: {
          select: { debe: true, haber: true },
        },
      },
    });

    if (!cuenta) return { error: "Cuenta no encontrada" };

    const totalDebe = cuenta.lineasAsiento.reduce((s, l) => s + Number(l.debe), 0);
    const totalHaber = cuenta.lineasAsiento.reduce((s, l) => s + Number(l.haber), 0);

    return {
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      activa: cuenta.activa,
      totalDebe,
      totalHaber,
      saldo: totalDebe - totalHaber,
    };
  },
});

// 17. ultimos_asientos
toolRegistry.registerTool({
  name: "ultimos_asientos",
  description: "Obtiene los últimos N asientos del libro diario.",
  module: "contabilidad",
  allowedRoles: ["ADMIN", "CONTADOR"],
  parameters: z.object({
    limit: z.number().default(10).describe("Cantidad de asientos a obtener"),
  }),
  execute: async (params: Record<string, unknown>) => {
    return prisma.asientoContable.findMany({
      select: {
        numero: true,
        fecha: true,
        tipo: true,
        descripcion: true,
        totalDebe: true,
        totalHaber: true,
        cerrado: true,
        lineas: {
          select: {
            cuenta: { select: { codigo: true, nombre: true } },
            debe: true,
            haber: true,
            descripcion: true,
          },
        },
      },
      orderBy: { numero: "desc" },
      take: (params.limit as number) || 10,
    });
  },
});

// 18. ejecucion_presupuestaria
toolRegistry.registerTool({
  name: "ejecucion_presupuestaria",
  description:
    "Estado de ejecución del presupuesto por categoría para un mes/año dado.",
  module: "contabilidad",
  allowedRoles: ["ADMIN", "CONTADOR"],
  parameters: z.object({
    mes: z.number().optional().describe("Mes (1-12). Default: mes actual"),
    anio: z.number().optional().describe("Año. Default: año actual"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const ahora = new Date();
    const mes = (params.mes as number) || ahora.getMonth() + 1;
    const anio = (params.anio as number) || ahora.getFullYear();

    const presupuestos = await prisma.presupuestoMensual.findMany({
      where: { anio, mes },
      select: {
        categoria: true,
        montoPresupuestado: true,
        montoEjecutado: true,
      },
      orderBy: { categoria: "asc" },
    });

    return presupuestos.map((p) => {
      const presupuestado = Number(p.montoPresupuestado);
      const ejecutado = Number(p.montoEjecutado);
      return {
        categoria: p.categoria,
        presupuestado,
        ejecutado,
        disponible: presupuestado - ejecutado,
        porcentajeEjecucion:
          presupuestado > 0
            ? Math.round((ejecutado / presupuestado) * 100)
            : 0,
      };
    });
  },
});
