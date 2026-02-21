import { CUENTAS } from "@/lib/contabilidad-utils";
import type { CategoriaGasto } from "@prisma/client";

/**
 * Mapea categoría de gasto a cuenta contable.
 * Usado por el handler contable al aprobar un gasto.
 */
export function categoriaToCuentaContable(categoria: CategoriaGasto): string {
  const mapa: Record<CategoriaGasto, string> = {
    COMBUSTIBLE: CUENTAS.GASTOS_ADMINISTRATIVOS,
    SEGUROS: CUENTAS.GASTOS_SEGUROS,
    MANTENIMIENTO: CUENTAS.GASTOS_MANTENIMIENTO,
    REPUESTOS: CUENTAS.GASTOS_MANTENIMIENTO,
    ADMINISTRATIVO: CUENTAS.GASTOS_ADMINISTRATIVOS,
    ALQUILER_LOCAL: CUENTAS.GASTOS_ADMINISTRATIVOS,
    SERVICIOS: CUENTAS.GASTOS_ADMINISTRATIVOS,
    IMPUESTOS: CUENTAS.GASTOS_IMPUESTOS,
    BANCARIOS: CUENTAS.GASTOS_BANCARIOS,
    PUBLICIDAD: CUENTAS.GASTOS_ADMINISTRATIVOS,
    SUELDOS: CUENTAS.GASTOS_ADMINISTRATIVOS,
    LEGAL: CUENTAS.GASTOS_ADMINISTRATIVOS,
    OTROS: CUENTAS.OTROS_EGRESOS,
  };
  return mapa[categoria] || CUENTAS.GASTOS_ADMINISTRATIVOS;
}

/**
 * Labels legibles para categorías.
 */
export const CATEGORIA_LABELS: Record<CategoriaGasto, string> = {
  COMBUSTIBLE: "Combustible",
  SEGUROS: "Seguros",
  MANTENIMIENTO: "Mantenimiento",
  REPUESTOS: "Repuestos",
  ADMINISTRATIVO: "Administrativo",
  ALQUILER_LOCAL: "Alquiler Local",
  SERVICIOS: "Servicios",
  IMPUESTOS: "Impuestos y Tasas",
  BANCARIOS: "Gastos Bancarios",
  PUBLICIDAD: "Publicidad",
  SUELDOS: "Sueldos",
  LEGAL: "Legal",
  OTROS: "Otros",
};
