import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toolRegistry } from "../tool-registry";

// 21. estado_sistema
toolRegistry.registerTool({
  name: "estado_sistema",
  description:
    "Métricas generales del sistema: total motos, clientes, contratos activos, usuarios, etc.",
  module: "sistema",
  allowedRoles: ["ADMIN"],
  parameters: z.object({}),
  execute: async () => {
    const [motos, clientes, contratosActivos, usuarios, ordenesTrabajo, anomaliasNuevas] =
      await Promise.all([
        prisma.moto.count(),
        prisma.cliente.count(),
        prisma.contrato.count({ where: { estado: "ACTIVO" } }),
        prisma.user.count(),
        prisma.ordenTrabajo.count({
          where: { estado: { notIn: ["COMPLETADA", "CANCELADA"] } },
        }),
        prisma.anomalia.count({ where: { estado: "NUEVA" } }),
      ]);

    return {
      motos,
      clientes,
      contratosActivos,
      usuarios,
      ordenesTrabajoAbiertas: ordenesTrabajo,
      anomaliasNuevas,
    };
  },
});
