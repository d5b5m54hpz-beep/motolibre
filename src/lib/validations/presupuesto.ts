import { z } from "zod";

export const presupuestoCreateSchema = z.object({
  anio: z.number().int().min(2020).max(2030),
  mes: z.number().int().min(1).max(12),
  categoria: z.enum([
    "COMBUSTIBLE", "SEGUROS", "MANTENIMIENTO", "REPUESTOS",
    "ADMINISTRATIVO", "ALQUILER_LOCAL", "SERVICIOS", "IMPUESTOS",
    "BANCARIOS", "PUBLICIDAD", "SUELDOS", "LEGAL", "OTROS",
  ]),
  montoPresupuestado: z.number().positive("Monto debe ser positivo"),
  notas: z.string().optional().nullable(),
});

export const presupuestoBulkSchema = z.object({
  anio: z.number().int().min(2020).max(2030),
  mes: z.number().int().min(1).max(12),
  items: z.array(z.object({
    categoria: z.string(),
    montoPresupuestado: z.number().min(0),
  })).min(1),
});
