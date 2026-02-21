import { z } from "zod";

export const solicitudCreateSchema = z.object({
  clienteId: z.string().min(1),
  marcaDeseada: z.string().min(1),
  modeloDeseado: z.string().min(1),
  condicionDeseada: z.enum(["NUEVA", "USADA"]),
  plan: z.enum(["MESES_3", "MESES_6", "MESES_9", "MESES_12", "MESES_24"]),
});

export const solicitudRejectSchema = z.object({
  motivoRechazo: z.string().min(1, "Motivo requerido"),
});

export type SolicitudCreateInput = z.infer<typeof solicitudCreateSchema>;
export type SolicitudRejectInput = z.infer<typeof solicitudRejectSchema>;
