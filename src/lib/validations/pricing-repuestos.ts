import { z } from "zod";

export const listaPrecioSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  tipo: z.enum(["RETAIL", "MAYORISTA", "TALLER", "PROMO"]),
  descripcion: z.string().optional().nullable(),
  vigenciaDesde: z.string().optional(),
  vigenciaHasta: z.string().optional().nullable(),
  prioridad: z.number().int().min(0).default(0),
});

export const itemListaPrecioSchema = z.object({
  repuestoId: z.string().min(1),
  precioUnitario: z.number().positive("Precio debe ser positivo"),
});

export const itemsListaBulkSchema = z.array(itemListaPrecioSchema);

export const reglaMarkupSchema = z.object({
  categoria: z.string().min(1),
  porcentaje: z.number().min(0).max(500),
  descripcion: z.string().optional().nullable(),
});

export const reglaMarkupBulkSchema = z.array(reglaMarkupSchema);

export const grupoClienteSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  descripcion: z.string().optional().nullable(),
  descuento: z.number().min(0).max(100),
});

export const miembroSchema = z.object({
  clienteId: z.string().min(1),
});

export const loteCambioSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  tipo: z.enum(["PORCENTAJE", "MONTO_FIJO"]),
  valor: z.number().refine((v) => v !== 0, "Valor no puede ser 0"),
  categorias: z.array(z.string()).default([]),
  proveedorId: z.string().optional().nullable(),
});

export const resolverPrecioSchema = z.object({
  repuestoId: z.string().min(1),
  clienteId: z.string().optional().nullable(),
  listaPrecioId: z.string().optional().nullable(),
});

export const whatIfSchema = z.object({
  tipo: z.enum(["PORCENTAJE", "MONTO_FIJO"]),
  valor: z.number().refine((v) => v !== 0, "Valor no puede ser 0"),
  categorias: z.array(z.string()).default([]),
  proveedorId: z.string().optional().nullable(),
});
