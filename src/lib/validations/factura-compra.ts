import { z } from "zod";

export const facturaCompraCreateSchema = z.object({
  proveedorNombre: z.string().min(1, "Proveedor requerido"),
  proveedorCuit: z.string().min(1, "CUIT requerido"),
  proveedorCondicionIva: z.string().min(1, "Condición IVA requerida"),
  tipo: z.enum(["A", "B", "C", "M"]),
  puntoVenta: z.string().min(1),
  numero: z.string().min(1),
  montoNeto: z.number().positive(),
  montoIva: z.number().min(0),
  montoTotal: z.number().positive(),
  fechaEmision: z.string().min(1),
  fechaVencimiento: z.string().optional().nullable(),
  cae: z.string().optional().nullable(),
  concepto: z.string().min(1, "Concepto requerido"),
  categoria: z.enum([
    "COMBUSTIBLE", "SEGUROS", "MANTENIMIENTO", "REPUESTOS",
    "ADMINISTRATIVO", "ALQUILER_LOCAL", "SERVICIOS", "IMPUESTOS",
    "BANCARIOS", "PUBLICIDAD", "SUELDOS", "LEGAL", "OTROS",
  ]).optional().nullable(),
  motoId: z.string().optional().nullable(),
});

export const facturaCompraPagarSchema = z.object({
  monto: z.number().positive("Monto debe ser positivo"),
  medioPago: z.string().default("CAJA"),
});
