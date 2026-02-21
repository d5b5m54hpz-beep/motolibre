import { z } from "zod";

export const ordenCompraCreateSchema = z.object({
  proveedorId: z.string().min(1, "Proveedor requerido"),
  fechaEntregaEstimada: z.string().optional().nullable(),
  moneda: z.string().default("ARS"),
  observaciones: z.string().optional().nullable(),
  items: z.array(z.object({
    descripcion: z.string().min(1, "Descripción requerida"),
    codigo: z.string().optional().nullable(),
    repuestoId: z.string().optional().nullable(),
    cantidad: z.number().int().positive("Cantidad debe ser positiva"),
    precioUnitario: z.number().positive("Precio debe ser positivo"),
  })).min(1, "Al menos un item requerido"),
});

export const ocCambiarEstadoSchema = z.object({
  estado: z.enum(["ENVIADA", "CONFIRMADA", "RECIBIDA", "CANCELADA"]),
  motivoCancelacion: z.string().optional(),
  itemsRecibidos: z.array(z.object({
    itemId: z.string(),
    cantidadRecibida: z.number().int().min(0),
  })).optional(),
});

export const itemOCCreateSchema = z.object({
  descripcion: z.string().min(1, "Descripción requerida"),
  codigo: z.string().optional().nullable(),
  repuestoId: z.string().optional().nullable(),
  cantidad: z.number().int().positive("Cantidad debe ser positiva"),
  precioUnitario: z.number().positive("Precio debe ser positivo"),
});
