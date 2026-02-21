import { z } from "zod";

export const embarqueCreateSchema = z.object({
  proveedorId: z.string().min(1, "Proveedor requerido"),
  puertoOrigen: z.string().optional().nullable(),
  naviera: z.string().optional().nullable(),
  numeroContenedor: z.string().optional().nullable(),
  numeroBL: z.string().optional().nullable(),
  tipoTransporte: z.enum(["MARITIMO", "AEREO"]).default("MARITIMO"),
  monedaFOB: z.string().default("USD"),
  fechaEmbarque: z.string().optional().nullable(),
  fechaEstimadaArribo: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  items: z.array(z.object({
    descripcion: z.string().min(1),
    codigoProveedor: z.string().optional().nullable(),
    repuestoId: z.string().optional().nullable(),
    esMoto: z.boolean().default(false),
    cantidad: z.number().int().positive(),
    precioFOBUnitario: z.number().positive(),
    posicionArancelaria: z.string().optional().nullable(),
    alicuotaDerechos: z.number().min(0).max(100).optional().nullable(),
  })).min(1, "Al menos un item"),
});

export const despachoCreateSchema = z.object({
  numeroDespacho: z.string().optional().nullable(),
  fechaDespacho: z.string().min(1),
  despachante: z.string().optional().nullable(),
  tipoCambio: z.number().positive("Tipo de cambio requerido"),
  costoFlete: z.number().min(0).default(0),
  costoSeguro: z.number().min(0).default(0),
  derechosImportacion: z.number().min(0),
  tasaEstadistica: z.number().min(0),
  ivaImportacion: z.number().min(0),
  ivaAdicional: z.number().min(0),
  ingresosBrutos: z.number().min(0).default(0),
  gastosVarios: z.number().min(0).default(0),
  observaciones: z.string().optional().nullable(),
});

export const confirmarCostosSchema = z.object({
  confirmar: z.literal(true),
});

export const recepcionItemSchema = z.object({
  items: z.array(z.object({
    itemEmbarqueId: z.string().min(1),
    cantidadRecibida: z.number().int().min(0),
    observaciones: z.string().optional().nullable(),
  })).min(1),
});
