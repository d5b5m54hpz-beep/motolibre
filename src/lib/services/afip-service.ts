import Afip from "@afipsdk/afip.js";

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const afipConfig = {
  CUIT: Number(process.env.AFIP_CUIT) || 30716172224,
  cert: process.env.AFIP_CERT || "",
  key: process.env.AFIP_KEY || "",
  production: process.env.AFIP_PRODUCTION === "true",
};

let afipInstance: Afip | null = null;

function getAfip(): Afip | null {
  if (!afipConfig.cert || !afipConfig.key) {
    return null;
  }
  if (!afipInstance) {
    afipInstance = new Afip({
      CUIT: afipConfig.CUIT,
      cert: afipConfig.cert,
      key: afipConfig.key,
      production: afipConfig.production,
    });
  }
  return afipInstance;
}

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export interface DatosFacturaAFIP {
  tipoComprobante: number;
  puntoVenta: number;
  tipoDocReceptor: number;
  nroDocReceptor: number;
  importeNeto: number;
  importeIVA: number;
  importeTotal: number;
  concepto: number;
  fechaServicioDesde?: string;
  fechaServicioHasta?: string;
  fechaVencimientoPago?: string;
  // Para NC: referencia al comprobante original
  comprobanteAsociado?: {
    tipo: number;
    puntoVenta: number;
    numero: number;
    fecha: string;
  };
}

export interface ResultadoCAE {
  cae: string;
  caeFchVto: string;
  nroComprobante: number;
  resultado: "A" | "R" | "PENDIENTE" | "STUB";
  observaciones?: string;
}

// ═══════════════════════════════════════════════════════════════
// MAPEOS AFIP
// ═══════════════════════════════════════════════════════════════

export const TIPO_COMPROBANTE_AFIP: Record<string, number> = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
  NOTA_CREDITO_A: 3,
  NOTA_CREDITO_B: 8,
  NOTA_CREDITO_C: 13,
  NOTA_DEBITO_A: 2,
  NOTA_DEBITO_B: 7,
  NOTA_DEBITO_C: 12,
};

export const TIPO_DOC_AFIP = {
  CUIT: 80,
  DNI: 96,
  CONSUMIDOR_FINAL: 99,
} as const;

// ═══════════════════════════════════════════════════════════════
// FUNCIONES PRINCIPALES
// ═══════════════════════════════════════════════════════════════

export function isAfipConfigured(): boolean {
  return Boolean(afipConfig.cert && afipConfig.key);
}

export function getAfipEntorno(): "produccion" | "homologacion" | "stub" {
  if (!isAfipConfigured()) return "stub";
  return afipConfig.production ? "produccion" : "homologacion";
}

export async function obtenerUltimoComprobante(
  puntoVenta: number,
  tipoComprobante: number
): Promise<number> {
  const afip = getAfip();
  if (!afip) throw new Error("AFIP no configurado");
  return afip.ElectronicBilling.getLastVoucher(puntoVenta, tipoComprobante);
}

/**
 * Solicita CAE a AFIP para una factura o nota de crédito.
 * Si no hay certificado configurado, retorna CAE stub.
 */
export async function solicitarCAE(datos: DatosFacturaAFIP): Promise<ResultadoCAE> {
  const afip = getAfip();

  // Modo stub si no hay certificado
  if (!afip) {
    console.warn("[AFIP] Sin certificado configurado — modo stub activo");
    const ts = Date.now().toString().slice(-14).padStart(14, "0");
    const vto = new Date();
    vto.setDate(vto.getDate() + 10);
    return {
      cae: ts,
      caeFchVto: vto.toISOString().slice(0, 10).replace(/-/g, ""),
      nroComprobante: 0,
      resultado: "STUB",
      observaciones: "Modo stub — sin certificado AFIP configurado",
    };
  }

  const hoy = new Date();
  const fechaStr = hoy.toISOString().slice(0, 10).replace(/-/g, "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const datosAfip: Record<string, any> = {
    CbteTipo: datos.tipoComprobante,
    PtoVta: datos.puntoVenta,
    Concepto: datos.concepto,
    DocTipo: datos.tipoDocReceptor,
    DocNro: datos.nroDocReceptor,
    CbteFch: fechaStr,
    ImpTotal: datos.importeTotal,
    ImpTotConc: 0,
    ImpNeto: datos.importeNeto,
    ImpOpEx: 0,
    ImpIVA: datos.importeIVA,
    ImpTrib: 0,
    MonId: "PES",
    MonCotiz: 1,
  };

  // IVA detallado (solo para comprobantes tipo A: factura=1, NC=3, ND=2)
  if ([1, 2, 3].includes(datos.tipoComprobante) && datos.importeIVA > 0) {
    datosAfip.Iva = [
      { Id: 5, BaseImp: datos.importeNeto, Importe: datos.importeIVA },
    ];
  }

  // Fechas de servicio (concepto >= 2: servicios o productos+servicios)
  if (datos.concepto >= 2) {
    datosAfip.FchServDesde = datos.fechaServicioDesde || fechaStr;
    datosAfip.FchServHasta = datos.fechaServicioHasta || fechaStr;
    datosAfip.FchVtoPago = datos.fechaVencimientoPago || fechaStr;
  }

  // Comprobante asociado (para notas de crédito/débito)
  if (datos.comprobanteAsociado) {
    datosAfip.CbtesAsoc = [
      {
        Tipo: datos.comprobanteAsociado.tipo,
        PtoVta: datos.comprobanteAsociado.puntoVenta,
        Nro: datos.comprobanteAsociado.numero,
        Cuit: String(afipConfig.CUIT),
        CbteFch: datos.comprobanteAsociado.fecha,
      },
    ];
  }

  try {
    const resultado = await afip.ElectronicBilling.createNextVoucher(datosAfip);

    return {
      cae: resultado.CAE,
      caeFchVto: resultado.CAEFchVto.replace(/-/g, ""),
      nroComprobante: resultado.voucherNumber,
      resultado: "A",
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[AFIP] Error solicitando CAE:", msg);

    return {
      cae: "",
      caeFchVto: "",
      nroComprobante: 0,
      resultado: "R",
      observaciones: msg,
    };
  }
}

/**
 * Verifica si AFIP está disponible (server status).
 */
export async function verificarEstadoAFIP(): Promise<{
  disponible: boolean;
  mensaje: string;
  entorno: "produccion" | "homologacion" | "stub";
}> {
  const entorno = getAfipEntorno();
  if (entorno === "stub") {
    return { disponible: true, mensaje: "Modo stub activo (sin certificado AFIP)", entorno };
  }

  try {
    const afip = getAfip();
    if (!afip) throw new Error("No se pudo crear instancia AFIP");
    const status = await afip.ElectronicBilling.getServerStatus();
    return {
      disponible: Boolean(status.AppServer && status.DbServer && status.AuthServer),
      mensaje: `App: ${status.AppServer}, DB: ${status.DbServer}, Auth: ${status.AuthServer}`,
      entorno,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { disponible: false, mensaje: msg, entorno };
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS DE MAPEO
// ═══════════════════════════════════════════════════════════════

/**
 * Convierte tipo de factura del sistema (A, B) + tipo de comprobante (FACTURA, NC)
 * al código numérico de AFIP.
 */
export function tipoComprobanteAFIP(
  comprobante: "FACTURA" | "NOTA_CREDITO" | "NOTA_DEBITO",
  letra: "A" | "B" | "C"
): number {
  const key = `${comprobante}_${letra}`;
  return TIPO_COMPROBANTE_AFIP[key] || 0;
}

/**
 * Determina tipo de documento del receptor según condición IVA.
 * Acepta tanto enum (RESPONSABLE_INSCRIPTO) como texto legible (Responsable Inscripto).
 */
export function tipoDocumentoReceptor(condicionIVA: string): number {
  const normalized = condicionIVA.toUpperCase().replace(/\s+/g, "_");
  switch (normalized) {
    case "RESPONSABLE_INSCRIPTO":
    case "MONOTRIBUTISTA":
    case "EXENTO":
      return TIPO_DOC_AFIP.CUIT;
    case "CONSUMIDOR_FINAL":
    default:
      return TIPO_DOC_AFIP.CONSUMIDOR_FINAL;
  }
}

/**
 * Formatea fecha a YYYYMMDD para AFIP.
 */
export function formatFechaAFIP(date: Date | string | null | undefined): string {
  if (!date) {
    const hoy = new Date();
    return hoy.toISOString().slice(0, 10).replace(/-/g, "");
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Parsea fecha AFIP (YYYYMMDD) a Date.
 */
export function parseFechaAFIP(fechaAFIP: string): Date | null {
  if (!fechaAFIP || fechaAFIP.length < 8) return null;
  const clean = fechaAFIP.replace(/-/g, "");
  const y = clean.slice(0, 4);
  const m = clean.slice(4, 6);
  const d = clean.slice(6, 8);
  return new Date(`${y}-${m}-${d}T00:00:00`);
}
