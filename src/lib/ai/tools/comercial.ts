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

// cartera_morosidad
toolRegistry.registerTool({
  name: "cartera_morosidad",
  description:
    "Muestra el reporte de morosidad: clientes con cuotas vencidas, aging report y monto total en mora.",
  module: "comercial",
  allowedRoles: ["ADMIN", "COMERCIAL", "CONTADOR"],
  parameters: z.object({}),
  execute: async () => {
    const now = new Date();
    const cuotasVencidas = await prisma.cuota.findMany({
      where: { estado: "VENCIDA" },
      include: {
        contrato: {
          include: {
            cliente: { select: { nombre: true, apellido: true } },
            moto: { select: { marca: true, modelo: true } },
          },
        },
      },
    });

    const clienteMap = new Map<string, {
      nombre: string; moto: string; cuotas: number; monto: number; diasMax: number;
    }>();
    const aging = { d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
    let totalMora = 0;

    for (const c of cuotasVencidas) {
      const dias = Math.floor((now.getTime() - c.fechaVencimiento.getTime()) / 86400000);
      const monto = Number(c.montoPagado ?? c.monto);
      totalMora += monto;
      if (dias <= 30) aging.d1_30 += monto;
      else if (dias <= 60) aging.d31_60 += monto;
      else if (dias <= 90) aging.d61_90 += monto;
      else aging.d90plus += monto;

      const key = c.contratoId;
      const prev = clienteMap.get(key) ?? { nombre: `${c.contrato.cliente.nombre} ${c.contrato.cliente.apellido}`, moto: `${c.contrato.moto.marca} ${c.contrato.moto.modelo}`, cuotas: 0, monto: 0, diasMax: 0 };
      prev.cuotas++;
      prev.monto += monto;
      prev.diasMax = Math.max(prev.diasMax, dias);
      clienteMap.set(key, prev);
    }

    return {
      totalEnMora: totalMora,
      clientesAfectados: clienteMap.size,
      aging,
      topClientes: Array.from(clienteMap.values()).sort((a, b) => b.monto - a.monto).slice(0, 10),
    };
  },
});
