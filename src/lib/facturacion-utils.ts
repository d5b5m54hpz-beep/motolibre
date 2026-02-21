import { prisma } from "@/lib/prisma";
import type { TipoFactura, CondicionIva } from "@prisma/client";

const IVA_RATE = 0.21;

/**
 * Determina el tipo de factura según la condición IVA del cliente.
 * MotoLibre es RI, por lo que:
 * - Cliente RI → Factura A
 * - Cliente CF/Mono/Exento → Factura B
 */
export function determinarTipoFactura(condicionIvaCliente: CondicionIva): TipoFactura {
  switch (condicionIvaCliente) {
    case "RESPONSABLE_INSCRIPTO":
      return "A";
    default:
      return "B";
  }
}

/**
 * Calcula montos de factura.
 * - Factura A: el monto del pago incluye IVA → descomponer
 * - Factura B: IVA incluido, no se discrimina (iva = 0)
 *
 * @param montoTotal - el monto que pagó el cliente (siempre es el total)
 * @param tipo - tipo de factura
 */
export function calcularMontosFactura(montoTotal: number, tipo: TipoFactura) {
  if (tipo === "A") {
    const montoNeto = Math.round((montoTotal / (1 + IVA_RATE)) * 100) / 100;
    const montoIva = Math.round((montoTotal - montoNeto) * 100) / 100;
    return { montoNeto, montoIva, montoTotal };
  } else {
    return { montoNeto: montoTotal, montoIva: 0, montoTotal };
  }
}

/**
 * Genera el próximo número de factura para un tipo + punto de venta.
 */
export async function proximoNumeroFactura(
  tipo: TipoFactura,
  puntoVenta: string = "0001"
): Promise<{ numero: number; numeroCompleto: string }> {
  const ultima = await prisma.factura.findFirst({
    where: { tipo, puntoVenta },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const numero = (ultima?.numero ?? 0) + 1;
  const numeroCompleto = `${tipo}-${puntoVenta}-${String(numero).padStart(8, "0")}`;

  return { numero, numeroCompleto };
}

/**
 * Genera un CAE stub (ficticio).
 * En producción (punto 7.2) se reemplaza por llamada a AFIP WSFE.
 */
export function generarCAEStub(): { cae: string; caeVencimiento: Date } {
  const timestamp = Date.now().toString().slice(-14).padStart(14, "0");
  const vencimiento = new Date();
  vencimiento.setDate(vencimiento.getDate() + 10);

  return {
    cae: timestamp,
    caeVencimiento: vencimiento,
  };
}

/**
 * Datos del emisor desde env.
 */
export function datosEmisor() {
  return {
    razonSocial: process.env.FACTURA_RAZON_SOCIAL ?? "MotoLibre S.A.",
    cuit: process.env.FACTURA_CUIT ?? "30-71617222-4",
    condicionIva: process.env.FACTURA_CONDICION_IVA ?? "Responsable Inscripto",
    domicilio: process.env.FACTURA_DOMICILIO ?? "Tucumán 141 P4 Of. I, CABA (C1049AAA)",
    puntoVenta: process.env.FACTURA_PUNTO_VENTA ?? "0001",
    iibb: process.env.FACTURA_IIBB ?? "Exento",
    inicioActividades: process.env.FACTURA_INICIO_ACTIVIDADES ?? "14/09/2018",
  };
}

/**
 * Mapa de condición IVA enum → texto legible.
 */
export const CONDICION_IVA_TEXTO: Record<string, string> = {
  CONSUMIDOR_FINAL: "Consumidor Final",
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  MONOTRIBUTISTA: "Monotributista",
  EXENTO: "Exento",
};
