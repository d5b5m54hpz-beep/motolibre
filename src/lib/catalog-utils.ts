import type { TipoMoto } from "@prisma/client";

export const TIPO_MOTO_LABELS: Record<TipoMoto, string> = {
  NAKED: "Naked",
  TOURING: "Touring",
  SPORT: "Sport",
  SCOOTER: "Scooter",
  CUSTOM: "Custom",
};

export function getCondicion(km: number, anio: number): "NUEVA" | "USADA" {
  const currentYear = new Date().getFullYear();
  return km === 0 && anio >= currentYear ? "NUEVA" : "USADA";
}
