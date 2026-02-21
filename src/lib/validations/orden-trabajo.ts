import { z } from "zod";

export const otCreateSchema = z.object({
  tipo: z.enum(["PREVENTIVO", "CORRECTIVO", "EMERGENCIA"]),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).default("MEDIA"),
  tipoService: z.enum(["SERVICE_5000KM", "SERVICE_10000KM", "SERVICE_15000KM", "SERVICE_20000KM", "SERVICE_GENERAL", "REPARACION", "INSPECCION", "OTRO"]).optional().nullable(),
  motoId: z.string().min(1, "Moto requerida"),
  descripcion: z.string().min(1, "Descripción requerida"),
  fechaProgramada: z.string().optional().nullable(),
  tallerNombre: z.string().optional().nullable(),
  mecanicoNombre: z.string().optional().nullable(),
  mantenimientoProgramadoId: z.string().optional().nullable(),
});

export const otCheckInSchema = z.object({
  kmIngreso: z.number().int().positive("Km debe ser positivo"),
});

export const otCheckOutSchema = z.object({
  kmEgreso: z.number().int().positive().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  costoManoObra: z.number().min(0).default(0),
});

export const tareaCreateSchema = z.object({
  categoria: z.enum(["MOTOR", "FRENOS", "SUSPENSION", "ELECTRICA", "CARROCERIA", "NEUMATICOS", "TRANSMISION", "LUBRICACION", "INSPECCION", "OTRO"]),
  descripcion: z.string().min(1),
});

export const tareaResultadoSchema = z.object({
  resultado: z.enum(["PENDIENTE", "OK", "REQUIERE_ATENCION", "REEMPLAZADO", "NO_APLICA"]),
  observaciones: z.string().optional().nullable(),
});

export const repuestoOTCreateSchema = z.object({
  nombre: z.string().min(1),
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().positive(),
  repuestoId: z.string().optional().nullable(),
});

export const planMantenimientoSchema = z.object({
  nombre: z.string().min(1),
  tipoService: z.enum(["SERVICE_5000KM", "SERVICE_10000KM", "SERVICE_15000KM", "SERVICE_20000KM", "SERVICE_GENERAL", "REPARACION", "INSPECCION", "OTRO"]),
  descripcion: z.string().optional().nullable(),
  kmIntervalo: z.number().int().positive().optional().nullable(),
  diasIntervalo: z.number().int().positive().optional().nullable(),
});
