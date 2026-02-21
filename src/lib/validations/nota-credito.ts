import { z } from "zod";

export const notaCreditoCreateSchema = z.object({
  facturaId: z.string().min(1, "Factura requerida"),
  tipo: z.enum(["ANULACION", "DESCUENTO", "DEVOLUCION"]),
  montoTotal: z.number().positive("Monto debe ser positivo"),
  motivo: z.string().min(1, "Motivo requerido"),
});
