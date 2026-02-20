import { z } from "zod";

export const clienteCreateSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(100),
  apellido: z.string().min(1, "Apellido requerido").max(100),
  email: z.string().email("Email inválido"),
  telefono: z.string().min(6, "Teléfono requerido").max(20),
  telefonoAlt: z.string().max(20).optional().nullable(),
  dni: z.string().min(7, "DNI requerido").max(10),
  fechaNacimiento: z.string().optional().nullable(),
  genero: z.enum(["M", "F", "X"]).optional().nullable(),
  nacionalidad: z.string().max(50).optional().nullable(),
  tipoLicencia: z.enum(["A1", "A2", "A3"]).optional().nullable(),
  numLicencia: z.string().max(20).optional().nullable(),
  fechaVencLicencia: z.string().optional().nullable(),
  calle: z.string().max(200).optional().nullable(),
  numero: z.string().max(10).optional().nullable(),
  piso: z.string().max(5).optional().nullable(),
  depto: z.string().max(5).optional().nullable(),
  localidad: z.string().max(100).optional().nullable(),
  provincia: z.string().max(50).optional().nullable(),
  codigoPostal: z.string().max(10).optional().nullable(),
  cuit: z.string().max(13).optional().nullable(),
  condicionIva: z
    .enum(["RESPONSABLE_INSCRIPTO", "MONOTRIBUTISTA", "CONSUMIDOR_FINAL", "EXENTO"])
    .optional(),
  plataformas: z.string().max(200).optional().nullable(),
  experienciaMeses: z.number().int().min(0).optional().nullable(),
  comoNosConocio: z.string().max(100).optional().nullable(),
  referidoPor: z.string().max(100).optional().nullable(),
  fotoUrl: z.string().url().optional().nullable(),
  notas: z.string().optional().nullable(),
});

export const clienteUpdateSchema = clienteCreateSchema.partial();

export const clienteRejectSchema = z.object({
  motivoRechazo: z.string().min(1, "Motivo requerido").max(500),
});

export const puntajeSchema = z.object({
  categoria: z.enum([
    "puntualidad_pago",
    "cuidado_moto",
    "documentacion",
    "antiguedad",
    "comportamiento",
  ]),
  valor: z.number().int().min(0).max(100),
  motivo: z.string().optional().nullable(),
});

export type ClienteCreateInput = z.infer<typeof clienteCreateSchema>;
export type ClienteUpdateInput = z.infer<typeof clienteUpdateSchema>;
