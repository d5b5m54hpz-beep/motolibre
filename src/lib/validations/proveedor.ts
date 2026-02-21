import { z } from "zod";

export const proveedorCreateSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  cuit: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  ciudad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  pais: z.string().default("Argentina"),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  contacto: z.string().optional().nullable(),
  tipoProveedor: z.enum(["NACIONAL", "INTERNACIONAL"]),
  condicionIva: z.string().optional().nullable(),
  categorias: z.array(z.string()).default([]),
  notas: z.string().optional().nullable(),
  cbu: z.string().optional().nullable(),
  alias: z.string().optional().nullable(),
  banco: z.string().optional().nullable(),
});
