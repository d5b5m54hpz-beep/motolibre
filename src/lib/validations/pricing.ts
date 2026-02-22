import { z } from "zod";

export const planAlquilerSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  codigo: z.string().min(1, "Código requerido"),
  descripcion: z.string().optional().nullable(),
  frecuencia: z.enum(["SEMANAL", "MENSUAL"]),
  duracionMeses: z.number().int().positive().optional().nullable(),
  cuotasTotal: z.number().int().positive().optional().nullable(),
  descuentoPorcentaje: z.number().min(0).max(100).optional().nullable(),
  incluyeTransferencia: z.boolean().default(false),
  orden: z.number().int().min(0).default(0),
});

export const precioModeloSchema = z.object({
  planId: z.string().min(1),
  modeloMoto: z.string().min(1, "Modelo requerido"),
  condicion: z.enum(["NUEVA", "USADA"]).default("USADA"),
  precioBase: z.number().positive("Precio debe ser positivo"),
  moneda: z.string().default("ARS"),
});

export const costoOperativoSchema = z.object({
  concepto: z.string().min(1, "Concepto requerido"),
  montoMensual: z.number().min(0),
  descripcion: z.string().optional().nullable(),
});

export const simulacionSchema = z.object({
  modeloMoto: z.string().min(1),
  condicion: z.string().default("USADA"),
  planId: z.string().min(1),
  duracionMeses: z.number().int().positive().optional(),
});

export const sugerenciaSchema = z.object({
  modeloMoto: z.string().min(1),
  margenObjetivo: z.number().min(1).max(90).default(30),
});
