import type { FrecuenciaPago } from "@prisma/client";

/**
 * Calcula el total de cuotas según duración y frecuencia.
 */
export function calcularTotalCuotas(
  duracionMeses: number,
  frecuencia: FrecuenciaPago
): number {
  switch (frecuencia) {
    case "SEMANAL":
      return Math.ceil(duracionMeses * 4.33);
    case "QUINCENAL":
      return duracionMeses * 2;
    case "MENSUAL":
      return duracionMeses;
  }
}

/**
 * Calcula el monto por período basado en el precio mensual de alquiler y la frecuencia.
 */
export function calcularMontoPeriodo(
  precioMensual: number,
  frecuencia: FrecuenciaPago
): number {
  switch (frecuencia) {
    case "SEMANAL":
      return Math.round(precioMensual / 4.33);
    case "QUINCENAL":
      return Math.round(precioMensual / 2);
    case "MENSUAL":
      return precioMensual;
  }
}

/**
 * Calcula la fecha de vencimiento de cada cuota según frecuencia de pago.
 */
export function generarFechasCuotas(
  fechaInicio: Date,
  duracionMeses: number,
  frecuencia: FrecuenciaPago
): Date[] {
  const fechas: Date[] = [];
  const totalCuotas = calcularTotalCuotas(duracionMeses, frecuencia);

  for (let i = 0; i < totalCuotas; i++) {
    const fecha = new Date(fechaInicio);

    switch (frecuencia) {
      case "SEMANAL":
        fecha.setDate(fecha.getDate() + (i + 1) * 7);
        break;
      case "QUINCENAL":
        fecha.setDate(fecha.getDate() + (i + 1) * 15);
        break;
      case "MENSUAL":
        fecha.setMonth(fecha.getMonth() + (i + 1));
        break;
    }

    fechas.push(fecha);
  }

  return fechas;
}

/**
 * Genera el preview de un contrato antes de crearlo.
 */
export function generarPreview(
  precioAlquilerMensual: number,
  frecuencia: FrecuenciaPago,
  duracionMeses: number,
  deposito: number,
  tieneOpcionCompra: boolean,
  precioCompraMoto?: number
) {
  const montoPeriodo = calcularMontoPeriodo(precioAlquilerMensual, frecuencia);
  const totalCuotas = calcularTotalCuotas(duracionMeses, frecuencia);
  const totalAlquiler = montoPeriodo * totalCuotas;
  const totalConDeposito = totalAlquiler + deposito;

  return {
    montoPeriodo,
    totalCuotas,
    frecuencia,
    duracionMeses,
    deposito,
    totalAlquiler,
    totalConDeposito,
    tieneOpcionCompra,
    precioCompra: tieneOpcionCompra ? (precioCompraMoto ?? 0) : null,
  };
}
