import { prisma } from "@/lib/prisma";
import type { EstadoOT } from "@prisma/client";

/**
 * Genera próximo número de OT: "OT-2026-00001"
 */
export async function proximoNumeroOT(): Promise<string> {
  const anio = new Date().getFullYear();
  const ultima = await prisma.ordenTrabajo.findFirst({
    where: { numero: { startsWith: `OT-${anio}` } },
    orderBy: { createdAt: "desc" },
    select: { numero: true },
  });

  let secuencia = 1;
  if (ultima) {
    const partes = ultima.numero.split("-");
    secuencia = parseInt(partes[2] || "0", 10) + 1;
  }

  return `OT-${anio}-${String(secuencia).padStart(5, "0")}`;
}

/**
 * Transiciones válidas de estado de OT.
 */
export const TRANSICIONES_OT: Record<EstadoOT, EstadoOT[]> = {
  SOLICITADA: ["APROBADA", "CANCELADA"],
  APROBADA: ["PROGRAMADA", "CANCELADA"],
  PROGRAMADA: ["EN_ESPERA_REPUESTOS", "EN_EJECUCION", "CANCELADA"],
  EN_ESPERA_REPUESTOS: ["PROGRAMADA", "EN_EJECUCION", "CANCELADA"],
  EN_EJECUCION: ["EN_REVISION", "CANCELADA"],
  EN_REVISION: ["COMPLETADA", "EN_EJECUCION", "CANCELADA"],
  COMPLETADA: [],
  CANCELADA: [],
};

/**
 * Valida si una transición de estado es permitida.
 */
export function validarTransicionOT(actual: EstadoOT, nuevo: EstadoOT): boolean {
  return TRANSICIONES_OT[actual]?.includes(nuevo) ?? false;
}
