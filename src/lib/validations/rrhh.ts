import { z } from "zod";

export const empleadoSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  dni: z.string().min(7).max(10),
  cuil: z.string().optional().nullable(),
  sexo: z.enum(["MASCULINO", "FEMENINO", "OTRO"]).optional().nullable(),
  estadoCivil: z
    .enum(["SOLTERO", "CASADO", "DIVORCIADO", "VIUDO", "UNION_CONVIVENCIAL"])
    .optional()
    .nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  contactoEmergencia: z.string().optional().nullable(),
  departamento: z.enum([
    "ADMINISTRACION",
    "OPERACIONES",
    "TALLER",
    "COMERCIAL",
    "GERENCIA",
  ]),
  cargo: z.string().min(1),
  fechaIngreso: z.string().min(1),
  jornada: z.enum(["COMPLETA", "MEDIA", "REDUCIDA"]).default("COMPLETA"),
  sueldoBasico: z.number().positive(),
  categoriaCCT: z.string().optional().nullable(),
  cbu: z.string().optional().nullable(),
  banco: z.string().optional().nullable(),
  artNombre: z.string().optional().nullable(),
  obraSocialNombre: z.string().optional().nullable(),
});

export const ausenciaSchema = z.object({
  empleadoId: z.string().min(1),
  tipo: z.enum([
    "VACACIONES",
    "ENFERMEDAD",
    "INJUSTIFICADA",
    "LICENCIA_ESPECIAL",
    "MATERNIDAD",
    "PATERNIDAD",
    "ESTUDIO",
    "FALLECIMIENTO_FAMILIAR",
  ]),
  fechaDesde: z.string().min(1),
  fechaHasta: z.string().min(1),
  motivo: z.string().optional().nullable(),
});

export const liquidacionSchema = z.object({
  empleadoId: z.string().min(1),
  periodo: z.string().regex(/^\d{4}-\d{2}$/, "Formato YYYY-MM"),
  tipo: z
    .enum(["MENSUAL", "AGUINALDO", "VACACIONES", "LIQUIDACION_FINAL"])
    .default("MENSUAL"),
  horasExtra: z.number().min(0).default(0),
  otrosHaberes: z.number().min(0).default(0),
  sindicato: z.number().min(0).max(10).optional(),
  impuestoGanancias: z.number().min(0).default(0),
  otrasDeduccion: z.number().min(0).default(0),
});
