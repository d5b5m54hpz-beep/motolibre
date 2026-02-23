import { z } from "zod";

export const wizardIniciarSchema = z.object({
  motoId: z.string().min(1, "Moto requerida"),
  planCodigo: z.string().min(1, "Plan requerido"),
});

export const wizardDatosSchema = z.object({
  motoId: z.string().min(1),
  planCodigo: z.string().min(1),
  nombre: z.string().min(1, "Nombre requerido").max(100),
  apellido: z.string().min(1, "Apellido requerido").max(100),
  email: z.string().email("Email inválido"),
  telefono: z.string().min(6, "Teléfono requerido").max(20),
  dni: z.string().min(7, "DNI requerido").max(10),
  usoMoto: z.string().max(100).optional(),
});

export const wizardConfirmarSchema = z.object({
  solicitudId: z.string().min(1, "Solicitud requerida"),
});

export const registroPublicoSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  nombre: z.string().min(1, "Nombre requerido").max(100),
});
