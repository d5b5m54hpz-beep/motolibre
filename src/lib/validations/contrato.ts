import { z } from "zod";

export const contratoCreateSchema = z.object({
  clienteId: z.string().min(1, "Cliente requerido"),
  motoId: z.string().min(1, "Moto requerida"),
  frecuenciaPago: z.enum(["SEMANAL", "QUINCENAL", "MENSUAL"]),
  duracionMeses: z.number().int().min(1).max(60),
  deposito: z.number().min(0),
  tieneOpcionCompra: z.boolean(),
  precioCompra: z.number().positive().optional().nullable(),
  renovacionAuto: z.boolean().optional(),
  notas: z.string().optional().nullable(),
});

export const contratoPreviewSchema = z.object({
  motoId: z.string().min(1, "Moto requerida"),
  frecuenciaPago: z.enum(["SEMANAL", "QUINCENAL", "MENSUAL"]),
  duracionMeses: z.number().int().min(1).max(60),
  deposito: z.number().min(0),
  tieneOpcionCompra: z.boolean(),
});

export const contratoCancelSchema = z.object({
  motivoCancelacion: z.string().min(1, "Motivo requerido"),
  penalidad: z.number().min(0).optional(),
});

export const contratoCompraSchema = z.object({
  precioCompra: z.number().positive("Precio requerido"),
});

export type ContratoCreateInput = z.infer<typeof contratoCreateSchema>;
export type ContratoPreviewInput = z.infer<typeof contratoPreviewSchema>;
export type ContratoCancelInput = z.infer<typeof contratoCancelSchema>;
export type ContratoCompraInput = z.infer<typeof contratoCompraSchema>;
