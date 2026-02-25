import { z } from "zod";

// ── Postulación pública (borrador mínimo) ──
export const solicitudCreateSchema = z.object({
  nombreTaller: z.string().min(1, "Nombre del taller requerido"),
  direccion: z.string().min(1, "Dirección requerida"),
  ciudad: z.string().min(1, "Ciudad requerida"),
  provincia: z.string().min(1, "Provincia requerida"),
  telefono: z.string().min(1, "Teléfono requerido"),
  email: z.string().email("Email inválido"),
  contactoNombre: z.string().min(1, "Nombre de contacto requerido"),
});

// ── Actualización parcial (borrador público o admin) ──
export const solicitudUpdateSchema = z.object({
  nombreTaller: z.string().min(1).optional(),
  razonSocial: z.string().optional().nullable(),
  cuit: z.string().optional().nullable(),
  direccion: z.string().min(1).optional(),
  ciudad: z.string().min(1).optional(),
  provincia: z.string().min(1).optional(),
  codigoPostal: z.string().optional().nullable(),
  telefono: z.string().min(1).optional(),
  email: z.string().email().optional(),
  sitioWeb: z.string().url().optional().nullable(),
  contactoNombre: z.string().min(1).optional(),
  contactoCargo: z.string().optional().nullable(),
  contactoCelular: z.string().optional().nullable(),
  cantidadMecanicos: z.number().int().positive().optional(),
  especialidades: z.array(z.string()).optional(),
  marcasExperiencia: z.array(z.string()).optional(),
  capacidadOTMes: z.number().int().positive().optional().nullable(),
  horariosAtencion: z.string().optional().nullable(),
  superficieM2: z.number().int().positive().optional().nullable(),
  cantidadElevadores: z.number().int().min(0).optional().nullable(),
  tieneDeposito: z.boolean().optional(),
  tieneEstacionamiento: z.boolean().optional(),
  latitud: z.number().optional().nullable(),
  longitud: z.number().optional().nullable(),
  notasInternas: z.string().optional().nullable(),
});

// ── Evaluación (admin evalúa solicitud) ──
export const evaluacionItemSchema = z.object({
  categoria: z.enum([
    "INFRAESTRUCTURA",
    "EQUIPAMIENTO",
    "PERSONAL",
    "DOCUMENTACION",
    "UBICACION",
    "EXPERIENCIA",
    "REFERENCIAS",
  ]),
  puntaje: z.number().int().min(0).max(10),
  peso: z.number().min(0.1).max(5).default(1.0),
  observaciones: z.string().optional().nullable(),
});

export const evaluacionSchema = z.object({
  evaluaciones: z.array(evaluacionItemSchema).min(1),
});

// ── Convenio comercial ──
export const convenioCreateSchema = z.object({
  tarifaHoraBase: z.number().positive("Tarifa requerida"),
  margenRepuestos: z.number().min(0).max(100).optional().nullable(),
  plazoFacturaDias: z.number().int().positive().default(30),
  fechaInicio: z.string().min(1, "Fecha inicio requerida"),
  fechaFin: z.string().optional().nullable(),
  renovacionAuto: z.boolean().default(true),
  zonaCobertura: z.string().optional().nullable(),
  otMaxMes: z.number().int().positive().optional().nullable(),
});

// ── Cambio de estado (admin) ──
export const cambiarEstadoSchema = z.object({
  nuevoEstado: z.enum([
    "RECIBIDA",
    "INCOMPLETA",
    "EN_EVALUACION",
    "APROBADA",
    "RECHAZADA",
    "EN_ESPERA",
    "CONVENIO_ENVIADO",
    "CONVENIO_FIRMADO",
    "ONBOARDING",
    "ACTIVO",
  ]),
  motivo: z.string().optional().nullable(),
});
