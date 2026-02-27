import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toolRegistry } from "../tool-registry";
import { simularContrato, sugerirPrecios } from "@/lib/pricing-engine";
import { getDashboardMargenes } from "@/lib/pricing-repuestos";

// 1. analisis_pricing_repuestos
toolRegistry.registerTool({
  name: "analisis_pricing_repuestos",
  description:
    "Analiza los márgenes de la cartera de repuestos: margen promedio, repuestos sin markup, top y bottom performers, y distribución por rango.",
  module: "pricing",
  allowedRoles: ["ADMIN", "COMERCIAL", "CONTADOR"],
  parameters: z.object({}),
  execute: async () => {
    const dashboard = await getDashboardMargenes();
    const reglas = await prisma.reglaMarkup.findMany({ orderBy: { categoria: "asc" } });
    return {
      margenPromedio: dashboard.margenPromedio,
      sinMarkup: dashboard.repuestosSinMarkup,
      sinPrecioVenta: dashboard.repuestosSinPrecioVenta,
      topRentables: dashboard.topMargen,
      bottomRentables: dashboard.bottomMargen,
      distribucionMargenes: dashboard.distribucionMargen,
      markupPorCategoria: reglas.map((r) => ({
        categoria: r.categoria,
        porcentaje: Number(r.porcentaje),
        activa: r.activa,
      })),
    };
  },
});

// 2. simular_contrato_alquiler
toolRegistry.registerTool({
  name: "simular_contrato_alquiler",
  description:
    "Simula un contrato de alquiler para un modelo y plan específicos: precio por período, cuotas, total, margen, y equivalente en USD.",
  module: "pricing",
  allowedRoles: ["ADMIN", "COMERCIAL", "VIEWER"],
  parameters: z.object({
    modeloMoto: z.string().describe("Modelo de la moto (ej: 'Yamaha MT-03', 'Honda CB 300R')"),
    condicion: z
      .enum(["NUEVA", "USADA"])
      .default("USADA")
      .describe("Condición de la moto"),
    planId: z.string().describe("ID del plan de alquiler"),
    duracionMeses: z
      .number()
      .optional()
      .describe("Duración del contrato en meses (default: el del plan)"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const resultado = await simularContrato({
      modeloMoto: params.modeloMoto as string,
      condicion: (params.condicion as "NUEVA" | "USADA") ?? "USADA",
      planId: params.planId as string,
      duracionMeses: params.duracionMeses as number | undefined,
    });
    return resultado ?? { error: "No se encontró precio para esa combinación modelo/plan/condición." };
  },
});

// 3. planes_alquiler
toolRegistry.registerTool({
  name: "planes_alquiler",
  description:
    "Lista los planes de alquiler disponibles con su frecuencia, descuento y duración.",
  module: "pricing",
  allowedRoles: ["ADMIN", "COMERCIAL", "VIEWER"],
  parameters: z.object({}),
  execute: async () => {
    return prisma.planAlquiler.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        frecuencia: true,
        descuentoPorcentaje: true,
        duracionMeses: true,
        incluyeTransferencia: true,
        _count: { select: { precios: true } },
      },
      orderBy: { nombre: "asc" },
    });
  },
});

// 4. sugerencia_precio_alquiler
toolRegistry.registerTool({
  name: "sugerencia_precio_alquiler",
  description:
    "Sugiere el precio de alquiler mensual y semanal para un modelo dado, basado en costos operativos y un margen objetivo.",
  module: "pricing",
  allowedRoles: ["ADMIN", "COMERCIAL"],
  parameters: z.object({
    modeloMoto: z.string().describe("Modelo de la moto"),
    margenObjetivo: z
      .number()
      .min(1)
      .max(90)
      .default(30)
      .describe("Margen objetivo en porcentaje (default: 30%)"),
  }),
  execute: async (params: Record<string, unknown>) => {
    return sugerirPrecios({
      modeloMoto: params.modeloMoto as string,
      margenObjetivo: params.margenObjetivo as number | undefined,
    });
  },
});
