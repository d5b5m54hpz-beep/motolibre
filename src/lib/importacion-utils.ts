import { prisma } from "@/lib/prisma";

export async function proximoNumeroEmbarque(): Promise<string> {
  const anio = new Date().getFullYear();
  const ultimo = await prisma.embarqueImportacion.findFirst({
    where: { numero: { startsWith: `IMP-${anio}` } },
    orderBy: { createdAt: "desc" },
    select: { numero: true },
  });

  let secuencia = 1;
  if (ultimo) {
    const partes = ultimo.numero.split("-");
    secuencia = parseInt(partes[2] || "0", 10) + 1;
  }

  return `IMP-${anio}-${String(secuencia).padStart(5, "0")}`;
}

export function calcularCIF(totalFOB: number, flete: number, seguro: number): number {
  return totalFOB + flete + seguro;
}

export function calcularTotalNacionalizado(params: {
  cifUSD: number;
  tipoCambio: number;
  derechosImportacion: number;
  tasaEstadistica: number;
  ivaImportacion: number;
  ivaAdicional: number;
  ingresosBrutos: number;
  gastosDespacho: number;
}): number {
  const cifARS = params.cifUSD * params.tipoCambio;
  return cifARS
    + params.derechosImportacion
    + params.tasaEstadistica
    + params.ivaImportacion
    + params.ivaAdicional
    + params.ingresosBrutos
    + params.gastosDespacho;
}

export function distribuirCostosPorItem(
  items: Array<{ id: string; subtotalFOB: number; cantidad: number }>,
  totalFOB: number,
  totalNacionalizado: number
): Array<{ itemId: string; costoNacionalizadoUnit: number; costoNacionalizadoTotal: number; porcentajeFOB: number }> {
  return items.map((item) => {
    const porcentajeFOB = totalFOB > 0 ? item.subtotalFOB / totalFOB : 0;
    const costoNacionalizadoTotal = Math.round(totalNacionalizado * porcentajeFOB * 100) / 100;
    const costoNacionalizadoUnit = item.cantidad > 0
      ? Math.round((costoNacionalizadoTotal / item.cantidad) * 100) / 100
      : 0;

    return {
      itemId: item.id,
      costoNacionalizadoUnit,
      costoNacionalizadoTotal,
      porcentajeFOB: Math.round(porcentajeFOB * 10000) / 10000,
    };
  });
}

export const TRANSICIONES_EMBARQUE: Record<string, string[]> = {
  BORRADOR: ["EN_TRANSITO", "CANCELADO"],
  EN_TRANSITO: ["EN_PUERTO", "CANCELADO"],
  EN_PUERTO: ["EN_ADUANA", "CANCELADO"],
  EN_ADUANA: ["DESPACHADO", "DESPACHADO_PARCIAL", "CANCELADO"],
  DESPACHADO_PARCIAL: ["DESPACHADO", "CANCELADO"],
  DESPACHADO: ["COSTOS_FINALIZADOS"],
  COSTOS_FINALIZADOS: ["EN_RECEPCION"],
  EN_RECEPCION: ["ALMACENADO"],
  ALMACENADO: [],
  CANCELADO: [],
};
