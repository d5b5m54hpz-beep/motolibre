import { z } from "zod";

export const tarifaCreateSchema = z.object({
  marca: z.string().min(1, "Marca requerida"),
  modelo: z.string().min(1, "Modelo requerido"),
  condicion: z.enum(["NUEVA", "USADA"]),
  plan: z.enum(["MESES_3", "MESES_6", "MESES_9", "MESES_12", "MESES_24"]),
  frecuencia: z.enum(["SEMANAL", "QUINCENAL", "MENSUAL"]),
  precio: z.number().positive("Precio debe ser positivo"),
  costoAmortizacion: z.number().nonnegative().optional().nullable(),
  costoMantenimiento: z.number().nonnegative().optional().nullable(),
  costoSeguro: z.number().nonnegative().optional().nullable(),
  costoPatente: z.number().nonnegative().optional().nullable(),
  costoOperativo: z.number().nonnegative().optional().nullable(),
  margenPct: z.number().min(0).max(1).optional().nullable(),
  vigenciaDesde: z.string().optional(),
  vigenciaHasta: z.string().optional().nullable(),
});

export const tarifaUpdateSchema = tarifaCreateSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const tarifaBulkCreateSchema = z.object({
  marca: z.string().min(1),
  modelo: z.string().min(1),
  condicion: z.enum(["NUEVA", "USADA"]),
  tarifas: z.array(z.object({
    plan: z.enum(["MESES_3", "MESES_6", "MESES_9", "MESES_12", "MESES_24"]),
    frecuencia: z.enum(["SEMANAL", "MENSUAL"]),
    precio: z.number().positive(),
  })).min(1, "Al menos una tarifa requerida"),
});

export type TarifaCreateInput = z.infer<typeof tarifaCreateSchema>;
export type TarifaBulkCreateInput = z.infer<typeof tarifaBulkCreateSchema>;
