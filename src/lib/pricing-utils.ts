import { prisma } from "@/lib/prisma";
import type { CondicionMoto, PlanDuracion, FrecuenciaPago } from "@prisma/client";

/**
 * Obtiene la tarifa vigente para una combinación específica.
 */
export async function getTarifaVigente(
  marca: string,
  modelo: string,
  condicion: CondicionMoto,
  plan: PlanDuracion,
  frecuencia: FrecuenciaPago
) {
  const now = new Date();

  return prisma.tarifaAlquiler.findFirst({
    where: {
      marca,
      modelo,
      condicion,
      plan,
      frecuencia,
      activo: true,
      vigenciaDesde: { lte: now },
      OR: [
        { vigenciaHasta: null },
        { vigenciaHasta: { gte: now } },
      ],
    },
    orderBy: { vigenciaDesde: "desc" },
  });
}

/**
 * Obtiene todas las tarifas vigentes para un modelo + condición.
 */
export async function getTarifasModelo(
  marca: string,
  modelo: string,
  condicion: CondicionMoto
) {
  const now = new Date();

  return prisma.tarifaAlquiler.findMany({
    where: {
      marca,
      modelo,
      condicion,
      activo: true,
      vigenciaDesde: { lte: now },
      OR: [
        { vigenciaHasta: null },
        { vigenciaHasta: { gte: now } },
      ],
    },
    orderBy: [{ plan: "asc" }, { frecuencia: "asc" }],
  });
}

/**
 * Obtiene modelos disponibles (que tienen tarifas activas).
 */
export async function getModelosConTarifa() {
  const tarifas = await prisma.tarifaAlquiler.findMany({
    where: { activo: true },
    distinct: ["marca", "modelo", "condicion"],
    select: { marca: true, modelo: true, condicion: true },
    orderBy: [{ marca: "asc" }, { modelo: "asc" }],
  });

  return tarifas;
}

/**
 * Convierte PlanDuracion a número de meses.
 */
export function planToMeses(plan: PlanDuracion): number {
  const map: Record<PlanDuracion, number> = {
    MESES_3: 3,
    MESES_6: 6,
    MESES_9: 9,
    MESES_12: 12,
    MESES_24: 24,
  };
  return map[plan];
}

/**
 * Convierte número de meses a PlanDuracion.
 */
export function mesesToPlan(meses: number): PlanDuracion | null {
  const map: Record<number, PlanDuracion> = {
    3: "MESES_3",
    6: "MESES_6",
    9: "MESES_9",
    12: "MESES_12",
    24: "MESES_24",
  };
  return map[meses] ?? null;
}
