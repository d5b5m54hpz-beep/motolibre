import { z } from "zod";

export const tallerCreateSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  tipo: z.enum(["INTERNO", "EXTERNO"]),
  direccion: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  contacto: z.string().optional().nullable(),
  especialidades: z.array(z.string()).default([]),
  notas: z.string().optional().nullable(),
  tarifaHora: z.number().positive().optional().nullable(),
});

export const mecanicoCreateSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  especialidad: z.string().optional().nullable(),
  tallerId: z.string().min(1, "Taller requerido"),
});
