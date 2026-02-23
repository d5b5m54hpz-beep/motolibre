import { z } from "zod";

export const motoCreateSchema = z.object({
  marca: z.string().min(1, "Marca requerida").max(50),
  modelo: z.string().min(1, "Modelo requerido").max(100),
  anio: z.number().int().min(2000).max(new Date().getFullYear() + 1),
  patente: z.string().max(10).optional().nullable(),
  numMotor: z.string().max(50).optional().nullable(),
  numChasis: z.string().max(50).optional().nullable(),
  color: z.string().max(30).optional().nullable(),
  cilindrada: z.number().int().positive().optional().nullable(),
  tipo: z.enum(["NAKED", "TOURING", "SPORT", "SCOOTER", "CUSTOM"]),
  km: z.number().int().min(0),
  precioCompra: z.number().positive().optional().nullable(),
  fechaCompra: z.string().optional().nullable(),
  proveedorCompra: z.string().max(200).optional().nullable(),
  numFacturaCompra: z.string().max(50).optional().nullable(),
  monedaCompra: z.enum(["ARS", "USD"]),
  cotizacionCompra: z.number().positive().optional().nullable(),
  precioAlquilerMensual: z.number().positive().optional().nullable(),
  vidaUtilMeses: z.number().int().min(1).max(240),
  valorResidual: z.number().min(0),
  fechaAltaContable: z.string().optional().nullable(),
  ubicacion: z.string().max(100).optional().nullable(),
  imagenUrl: z.string().url().optional().nullable(),
  fotos: z.array(z.string().url()).optional(),
  destacada: z.boolean().optional(),
  potencia: z.string().max(100).optional().nullable(),
  tipoMotor: z.string().max(100).optional().nullable(),
  arranque: z.string().max(50).optional().nullable(),
  frenos: z.string().max(100).optional().nullable(),
  capacidadTanque: z.number().positive().optional().nullable(),
  peso: z.number().positive().optional().nullable(),
  notas: z.string().optional().nullable(),
});

export const motoUpdateSchema = motoCreateSchema.partial();

export const motoChangeStateSchema = z.object({
  nuevoEstado: z.enum([
    "EN_DEPOSITO", "EN_PATENTAMIENTO", "DISPONIBLE", "RESERVADA",
    "ALQUILADA", "EN_SERVICE", "EN_REPARACION", "INMOVILIZADA",
    "RECUPERACION", "BAJA_TEMP", "BAJA_DEFINITIVA", "TRANSFERIDA",
  ]),
  motivo: z.string().min(1, "Motivo requerido").max(500),
});

export const motoBajaSchema = z.object({
  tipo: z.enum(["ROBO", "SINIESTRO", "VENTA", "CHATARRA", "DEVOLUCION_FABRICANTE"]),
  motivo: z.string().min(1, "Motivo requerido"),
  montoRecuperado: z.number().min(0).optional().nullable(),
  numDenuncia: z.string().optional().nullable(),
});

export const lecturaKmSchema = z.object({
  km: z.number().int().positive("KM debe ser positivo"),
  fuente: z.enum(["MANUAL", "GPS", "SERVICE", "INSPECCION"]),
  notas: z.string().optional().nullable(),
});

export type MotoCreateInput = z.infer<typeof motoCreateSchema>;
export type MotoUpdateInput = z.infer<typeof motoUpdateSchema>;
