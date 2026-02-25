import { z } from "zod";

export const mappingCreateSchema = z.object({
  repuestoId: z.string().min(1, "Repuesto requerido"),
  cantidadDefault: z.number().int().min(1).default(1),
  obligatorio: z.boolean().default(false),
  notas: z.string().optional().nullable(),
  origenIA: z.boolean().default(false),
});

export const mappingDeleteSchema = z.object({
  repuestoId: z.string().min(1, "Repuesto requerido"),
});
