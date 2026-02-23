import { z } from "zod";

export const perfilUpdateSchema = z.object({
  email: z.string().email("Email inválido").optional(),
  telefono: z.string().min(6).max(20).optional(),
  calle: z.string().max(200).optional().nullable(),
  numero: z.string().max(10).optional().nullable(),
  piso: z.string().max(5).optional().nullable(),
  depto: z.string().max(5).optional().nullable(),
  localidad: z.string().max(100).optional().nullable(),
  provincia: z.string().max(50).optional().nullable(),
  codigoPostal: z.string().max(10).optional().nullable(),
});

export const pagarCuotaSchema = z.object({
  cuotaId: z.string().min(1, "cuotaId requerido"),
});
