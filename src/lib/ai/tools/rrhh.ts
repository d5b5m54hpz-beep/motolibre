import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toolRegistry } from "../tool-registry";

// 19. listar_talleres
toolRegistry.registerTool({
  name: "listar_talleres",
  description: "Lista talleres activos con sus mecánicos.",
  module: "rrhh",
  allowedRoles: ["ADMIN", "OPERADOR", "RRHH_MANAGER"],
  parameters: z.object({}),
  execute: async () => {
    return prisma.taller.findMany({
      where: { activo: true },
      select: {
        nombre: true,
        tipo: true,
        direccion: true,
        telefono: true,
        email: true,
        contacto: true,
        especialidades: true,
        mecanicos: {
          select: { nombre: true, especialidad: true, activo: true },
        },
      },
      orderBy: { nombre: "asc" },
    });
  },
});

// 20. listar_proveedores
toolRegistry.registerTool({
  name: "listar_proveedores",
  description: "Lista proveedores activos con su tipo y contacto.",
  module: "rrhh",
  allowedRoles: ["ADMIN", "OPERADOR", "RRHH_MANAGER"],
  parameters: z.object({}),
  execute: async () => {
    return prisma.proveedor.findMany({
      where: { activo: true },
      select: {
        nombre: true,
        cuit: true,
        tipoProveedor: true,
        telefono: true,
        email: true,
        contacto: true,
        categorias: true,
        pais: true,
      },
      orderBy: { nombre: "asc" },
    });
  },
});
