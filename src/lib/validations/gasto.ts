import { z } from "zod";

export const gastoCreateSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  monto: z.number().positive("Monto debe ser positivo"),
  categoria: z.enum([
    "COMBUSTIBLE", "SEGUROS", "MANTENIMIENTO", "REPUESTOS",
    "ADMINISTRATIVO", "ALQUILER_LOCAL", "SERVICIOS", "IMPUESTOS",
    "BANCARIOS", "PUBLICIDAD", "SUELDOS", "LEGAL", "OTROS",
  ]),
  descripcion: z.string().min(1, "Descripción requerida"),
  medioPago: z.string().default("CAJA"),
  motoId: z.string().optional().nullable(),
  contratoId: z.string().optional().nullable(),
});

export const gastoAprobarSchema = z.object({
  aprobado: z.boolean(),
  motivo: z.string().optional(),
});
