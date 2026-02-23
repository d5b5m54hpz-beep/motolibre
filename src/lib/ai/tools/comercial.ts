import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toolRegistry } from "../tool-registry";

// 8. buscar_clientes
toolRegistry.registerTool({
  name: "buscar_clientes",
  description: "Busca clientes por nombre, apellido, DNI o email.",
  module: "comercial",
  allowedRoles: ["ADMIN", "COMERCIAL", "VIEWER"],
  parameters: z.object({
    buscar: z.string().describe("Texto de búsqueda (nombre, apellido, DNI o email)"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const buscar = params.buscar as string;
    return prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: { contains: buscar, mode: "insensitive" } },
          { apellido: { contains: buscar, mode: "insensitive" } },
          { dni: { contains: buscar } },
          { email: { contains: buscar, mode: "insensitive" } },
        ],
      },
      select: {
        nombre: true,
        apellido: true,
        dni: true,
        email: true,
        telefono: true,
        estado: true,
        score: true,
      },
      take: 10,
    });
  },
});

// 9. contratos_activos
toolRegistry.registerTool({
  name: "contratos_activos",
  description: "Lista contratos activos con cliente, moto y monto de cuota.",
  module: "comercial",
  allowedRoles: ["ADMIN", "COMERCIAL", "VIEWER"],
  parameters: z.object({
    limit: z.number().default(20).describe("Máximo de resultados"),
  }),
  execute: async (params: Record<string, unknown>) => {
    return prisma.contrato.findMany({
      where: { estado: "ACTIVO" },
      select: {
        estado: true,
        montoPeriodo: true,
        frecuenciaPago: true,
        fechaInicio: true,
        fechaFin: true,
        esLeaseToOwn: true,
        cliente: { select: { nombre: true, apellido: true } },
        moto: { select: { patente: true, marca: true, modelo: true } },
      },
      take: (params.limit as number) || 20,
      orderBy: { createdAt: "desc" },
    });
  },
});
