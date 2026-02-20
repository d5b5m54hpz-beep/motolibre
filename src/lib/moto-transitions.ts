import type { EstadoMoto } from "@prisma/client";

/**
 * Mapa de transiciones válidas de estado de moto.
 * Si una transición no está en esta tabla, se rechaza.
 */
export const TRANSICIONES_MOTO: Record<EstadoMoto, EstadoMoto[]> = {
  EN_DEPOSITO: ["EN_PATENTAMIENTO", "DISPONIBLE", "BAJA_DEFINITIVA"],
  EN_PATENTAMIENTO: ["DISPONIBLE", "EN_DEPOSITO"],
  DISPONIBLE: ["RESERVADA", "ALQUILADA", "EN_SERVICE", "EN_REPARACION", "INMOVILIZADA", "BAJA_TEMP", "BAJA_DEFINITIVA"],
  RESERVADA: ["ALQUILADA", "DISPONIBLE"],
  ALQUILADA: ["DISPONIBLE", "EN_SERVICE", "EN_REPARACION", "INMOVILIZADA", "RECUPERACION"],
  EN_SERVICE: ["DISPONIBLE", "ALQUILADA", "EN_REPARACION"],
  EN_REPARACION: ["DISPONIBLE", "ALQUILADA", "EN_SERVICE", "BAJA_TEMP", "BAJA_DEFINITIVA"],
  INMOVILIZADA: ["DISPONIBLE", "EN_REPARACION", "BAJA_DEFINITIVA"],
  RECUPERACION: ["DISPONIBLE", "EN_REPARACION", "BAJA_DEFINITIVA"],
  BAJA_TEMP: ["DISPONIBLE", "EN_REPARACION", "BAJA_DEFINITIVA"],
  BAJA_DEFINITIVA: ["TRANSFERIDA"],
  TRANSFERIDA: [],
};

export function esTransicionValida(
  estadoActual: EstadoMoto,
  estadoNuevo: EstadoMoto
): boolean {
  if (estadoActual === estadoNuevo) return false;
  return TRANSICIONES_MOTO[estadoActual]?.includes(estadoNuevo) ?? false;
}

export function estadosPosibles(estadoActual: EstadoMoto): EstadoMoto[] {
  return TRANSICIONES_MOTO[estadoActual] ?? [];
}
