import { z } from "zod";

export const cuentaBancariaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  banco: z.string().min(1, "Banco requerido"),
  tipo: z.enum(["CORRIENTE", "AHORRO", "MERCADOPAGO"]),
  numero: z.string().optional().nullable(),
  cbu: z.string().optional().nullable(),
  alias: z.string().optional().nullable(),
  moneda: z.string().default("ARS"),
  cuentaContableId: z.string().optional().nullable(),
});

export const iniciarConciliacionSchema = z.object({
  cuentaBancariaId: z.string().min(1),
  periodoDesde: z.string().min(1),
  periodoHasta: z.string().min(1),
});

export const matchManualSchema = z.object({
  extractoId: z.string().min(1),
  entidadTipo: z.string().min(1),
  entidadId: z.string().min(1),
});
