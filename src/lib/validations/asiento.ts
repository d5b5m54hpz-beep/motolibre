import { z } from "zod";

export const lineaAsientoSchema = z.object({
  cuentaId: z.string().min(1, "Cuenta requerida"),
  debe: z.number().min(0, "Debe no puede ser negativo"),
  haber: z.number().min(0, "Haber no puede ser negativo"),
  descripcion: z.string().optional(),
}).refine(
  (data) => data.debe > 0 || data.haber > 0,
  { message: "Cada línea debe tener Debe o Haber mayor a 0" }
).refine(
  (data) => !(data.debe > 0 && data.haber > 0),
  { message: "Una línea no puede tener Debe y Haber simultáneamente" }
);

export const asientoCreateSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  tipo: z.enum(["MANUAL", "VENTA", "COMPRA", "DEPRECIACION", "GASTO", "AJUSTE", "CIERRE"]),
  descripcion: z.string().min(1, "Descripción requerida"),
  lineas: z.array(lineaAsientoSchema).min(2, "Mínimo 2 líneas"),
}).refine(
  (data) => {
    const totalDebe = data.lineas.reduce((sum, l) => sum + l.debe, 0);
    const totalHaber = data.lineas.reduce((sum, l) => sum + l.haber, 0);
    return Math.abs(totalDebe - totalHaber) < 0.01; // tolerancia de redondeo
  },
  { message: "El asiento no balancea: Total Debe ≠ Total Haber" }
);

export const cuentaContableSchema = z.object({
  codigo: z.string().min(1, "Código requerido").regex(/^[1-5](\.\d+)*$/, "Formato: X.X.XX.XXX"),
  nombre: z.string().min(1, "Nombre requerido"),
  tipo: z.enum(["ACTIVO", "PASIVO", "PATRIMONIO", "INGRESO", "EGRESO"]),
  nivel: z.number().int().min(1).max(4),
  padreId: z.string().optional().nullable(),
  aceptaMovimientos: z.boolean(),
  descripcion: z.string().optional().nullable(),
});
