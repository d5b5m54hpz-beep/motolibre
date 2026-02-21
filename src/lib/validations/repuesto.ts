import { z } from "zod";

export const repuestoCreateSchema = z.object({
  codigo: z.string().min(1, "Código requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  descripcion: z.string().optional().nullable(),
  categoria: z.enum([
    "MOTOR", "FRENOS", "SUSPENSION", "ELECTRICA", "TRANSMISION",
    "CARROCERIA", "NEUMATICOS", "LUBRICANTES", "FILTROS",
    "TORNILLERIA", "ACCESORIOS", "OTRO",
  ]),
  marca: z.string().optional().nullable(),
  modeloCompatible: z.array(z.string()).default([]),
  stockMinimo: z.number().int().min(0).default(5),
  stockMaximo: z.number().int().min(0).optional().nullable(),
  unidad: z.string().default("unidad"),
  precioCompra: z.number().min(0).default(0),
  precioVenta: z.number().min(0).optional().nullable(),
  moneda: z.string().default("ARS"),
  precioFOB: z.number().min(0).optional().nullable(),
  proveedorId: z.string().optional().nullable(),
  proveedorCodigo: z.string().optional().nullable(),
  ubicacionId: z.string().optional().nullable(),
});

export const ajusteStockSchema = z.object({
  cantidad: z.number().int().refine((v) => v !== 0, "Cantidad no puede ser 0"),
  motivo: z.string().min(1, "Motivo requerido"),
});

export const movimientoStockSchema = z.object({
  tipo: z.enum(["INGRESO", "EGRESO", "AJUSTE_POSITIVO", "AJUSTE_NEGATIVO", "TRANSFERENCIA", "DEVOLUCION"]),
  cantidad: z.number().int().positive("Cantidad debe ser positiva"),
  descripcion: z.string().optional().nullable(),
  costoUnitario: z.number().min(0).optional().nullable(),
  referenciaTipo: z.string().optional().nullable(),
  referenciaId: z.string().optional().nullable(),
});

export const ubicacionCreateSchema = z.object({
  codigo: z.string().min(1, "Código requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  sector: z.string().optional().nullable(),
  nivel: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
});
