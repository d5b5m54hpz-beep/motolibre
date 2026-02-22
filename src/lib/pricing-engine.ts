import { prisma } from "@/lib/prisma";
import { obtenerTipoCambio } from "@/lib/tipo-cambio";

export interface ResultadoPricing {
  planId: string;
  planNombre: string;
  frecuencia: string;
  modeloMoto: string;
  condicion: string;
  precioBase: number;
  descuento: number;
  precioFinal: number;
  moneda: string;
  costoOperativoMensual: number;
  margenEstimado: number;
  margenPorcentaje: number;
}

/**
 * Calcula el precio de alquiler para un modelo y plan específicos.
 */
export async function calcularPrecio(params: {
  modeloMoto: string;
  condicion?: string;
  planId: string;
}): Promise<ResultadoPricing | null> {
  const { modeloMoto, condicion = "USADA", planId } = params;

  const precio = await prisma.precioModeloAlquiler.findFirst({
    where: {
      planId,
      modeloMoto,
      condicion,
      activo: true,
      OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: new Date() } }],
    },
    include: { plan: true },
  });

  if (!precio) return null;

  const costos = await prisma.costoOperativoConfig.findMany({ where: { activo: true } });
  const costoMensual = costos.reduce((sum, c) => sum + Number(c.montoMensual), 0);

  const costoOperativoPorPeriodo =
    precio.plan.frecuencia === "SEMANAL" ? costoMensual / 4.33 : costoMensual;

  const precioFinal = Number(precio.precioFinal);
  const margen = precioFinal - costoOperativoPorPeriodo;

  return {
    planId: precio.plan.id,
    planNombre: precio.plan.nombre,
    frecuencia: precio.plan.frecuencia,
    modeloMoto,
    condicion,
    precioBase: Number(precio.precioBase),
    descuento: Number(precio.plan.descuentoPorcentaje ?? 0),
    precioFinal,
    moneda: precio.moneda,
    costoOperativoMensual: Math.round(costoMensual),
    margenEstimado: Math.round(margen),
    margenPorcentaje: precioFinal > 0 ? Math.round((margen / precioFinal) * 100) : 0,
  };
}

/**
 * Simula un contrato completo: cuotas, total, costo operativo, margen.
 */
export async function simularContrato(params: {
  modeloMoto: string;
  condicion?: string;
  planId: string;
  duracionMeses?: number;
}): Promise<{
  plan: string;
  modelo: string;
  frecuencia: string;
  precioPorPeriodo: number;
  cantidadCuotas: number;
  totalContrato: number;
  costoOperativoTotal: number;
  margenTotal: number;
  margenPorcentaje: number;
  incluyeTransferencia: boolean;
  tipoCambio?: { compra: number; venta: number; precioEnUSD: number };
} | null> {
  const pricing = await calcularPrecio({
    modeloMoto: params.modeloMoto,
    condicion: params.condicion,
    planId: params.planId,
  });

  if (!pricing) return null;

  const plan = await prisma.planAlquiler.findUnique({ where: { id: params.planId } });
  if (!plan) return null;

  const duracion = params.duracionMeses ?? plan.duracionMeses ?? 12;
  const cuotasPorMes = pricing.frecuencia === "SEMANAL" ? 4.33 : 1;
  const cantidadCuotas = Math.round(duracion * cuotasPorMes);

  const totalContrato = pricing.precioFinal * cantidadCuotas;
  const costoTotal = pricing.costoOperativoMensual * duracion;
  const margenTotal = totalContrato - costoTotal;

  let tipoCambio;
  try {
    const tc = await obtenerTipoCambio();
    tipoCambio = {
      compra: tc.compra,
      venta: tc.venta,
      precioEnUSD: Math.round((pricing.precioFinal / tc.venta) * 100) / 100,
    };
  } catch { /* TC no disponible, no es bloqueante */ }

  return {
    plan: pricing.planNombre,
    modelo: pricing.modeloMoto,
    frecuencia: pricing.frecuencia,
    precioPorPeriodo: pricing.precioFinal,
    cantidadCuotas,
    totalContrato: Math.round(totalContrato),
    costoOperativoTotal: Math.round(costoTotal),
    margenTotal: Math.round(margenTotal),
    margenPorcentaje:
      totalContrato > 0 ? Math.round((margenTotal / totalContrato) * 100) : 0,
    incluyeTransferencia: plan.incluyeTransferencia,
    tipoCambio,
  };
}

/**
 * Sugiere precios basados en costos operativos + margen objetivo.
 */
export async function sugerirPrecios(params: {
  modeloMoto: string;
  margenObjetivo?: number;
}): Promise<{
  costoOperativoMensual: number;
  precioSugeridoMensual: number;
  precioSugeridoSemanal: number;
  margenObjetivo: number;
}> {
  const margenObj = params.margenObjetivo ?? 30;

  const costos = await prisma.costoOperativoConfig.findMany({ where: { activo: true } });
  const costoMensual = costos.reduce((sum, c) => sum + Number(c.montoMensual), 0);

  const precioMensual = Math.round(costoMensual / (1 - margenObj / 100));
  const precioSemanal = Math.round(precioMensual / 4.33);

  return {
    costoOperativoMensual: Math.round(costoMensual),
    precioSugeridoMensual: precioMensual,
    precioSugeridoSemanal: precioSemanal,
    margenObjetivo: margenObj,
  };
}
