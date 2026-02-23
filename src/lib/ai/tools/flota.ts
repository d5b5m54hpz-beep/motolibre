import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toolRegistry } from "../tool-registry";

// 1. buscar_motos
toolRegistry.registerTool({
  name: "buscar_motos",
  description:
    "Busca motos en la flota. Puede filtrar por estado (DISPONIBLE, ALQUILADA, EN_SERVICE, EN_REPARACION, EN_DEPOSITO, RESERVADA, INMOVILIZADA, BAJA_TEMP, BAJA_DEFINITIVA, TRANSFERIDA), marca, modelo, patente.",
  module: "flota",
  allowedRoles: ["ADMIN", "OPERADOR", "COMERCIAL", "VIEWER"],
  parameters: z.object({
    estado: z.string().optional().describe("Estado de la moto"),
    marca: z.string().optional().describe("Marca de la moto"),
    modelo: z.string().optional().describe("Modelo de la moto"),
    patente: z.string().optional().describe("Patente de la moto"),
    limit: z.number().default(20).describe("Máximo de resultados"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const where: Record<string, unknown> = {};
    if (params.estado) where.estado = params.estado;
    if (params.marca) where.marca = { contains: params.marca, mode: "insensitive" };
    if (params.modelo) where.modelo = { contains: params.modelo, mode: "insensitive" };
    if (params.patente) where.patente = { contains: params.patente, mode: "insensitive" };

    return prisma.moto.findMany({
      where,
      take: (params.limit as number) || 20,
      select: {
        patente: true,
        marca: true,
        modelo: true,
        anio: true,
        estado: true,
        km: true,
        color: true,
      },
      orderBy: { patente: "asc" },
    });
  },
});

// 2. resumen_flota
toolRegistry.registerTool({
  name: "resumen_flota",
  description:
    "Obtiene resumen de la flota: total de motos, cuántas por estado, km promedio.",
  module: "flota",
  allowedRoles: ["ADMIN", "OPERADOR", "COMERCIAL", "VIEWER"],
  parameters: z.object({}),
  execute: async () => {
    const [total, disponibles, alquiladas, enService, enReparacion, deposito, kmAvg] =
      await Promise.all([
        prisma.moto.count(),
        prisma.moto.count({ where: { estado: "DISPONIBLE" } }),
        prisma.moto.count({ where: { estado: "ALQUILADA" } }),
        prisma.moto.count({ where: { estado: "EN_SERVICE" } }),
        prisma.moto.count({ where: { estado: "EN_REPARACION" } }),
        prisma.moto.count({ where: { estado: "EN_DEPOSITO" } }),
        prisma.moto.aggregate({ _avg: { km: true } }),
      ]);
    return {
      total,
      disponibles,
      alquiladas,
      enService,
      enReparacion,
      enDeposito: deposito,
      kmPromedio: Math.round(kmAvg._avg.km ?? 0),
    };
  },
});

// 3. detalle_moto
toolRegistry.registerTool({
  name: "detalle_moto",
  description:
    "Obtiene detalle completo de una moto por patente o ID. Incluye contrato activo y cliente.",
  module: "flota",
  allowedRoles: ["ADMIN", "OPERADOR", "VIEWER"],
  parameters: z.object({
    patente: z.string().optional().describe("Patente de la moto"),
    id: z.string().optional().describe("ID de la moto"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const where = params.patente
      ? { patente: params.patente as string }
      : { id: params.id as string };
    const moto = await prisma.moto.findFirst({
      where,
      select: {
        patente: true,
        marca: true,
        modelo: true,
        anio: true,
        estado: true,
        km: true,
        color: true,
        cilindrada: true,
        tipo: true,
        precioAlquilerMensual: true,
        ubicacion: true,
        notas: true,
        contratos: {
          where: { estado: "ACTIVO" },
          take: 1,
          select: {
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            montoPeriodo: true,
            frecuenciaPago: true,
            cliente: { select: { nombre: true, apellido: true, telefono: true } },
          },
        },
      },
    });
    return moto;
  },
});

// 4. motos_mantenimiento_pendiente
toolRegistry.registerTool({
  name: "motos_mantenimiento_pendiente",
  description:
    "Lista motos que tienen órdenes de trabajo pendientes (no completadas ni canceladas).",
  module: "flota",
  allowedRoles: ["ADMIN", "OPERADOR"],
  parameters: z.object({}),
  execute: async () => {
    const ots = await prisma.ordenTrabajo.findMany({
      where: { estado: { notIn: ["COMPLETADA", "CANCELADA"] } },
      select: {
        numero: true,
        tipo: true,
        estado: true,
        prioridad: true,
        descripcion: true,
        fechaProgramada: true,
        tallerNombre: true,
        motoId: true,
      },
      orderBy: [{ prioridad: "desc" }, { fechaSolicitud: "asc" }],
      take: 20,
    });

    // Enrich with moto info
    const motoIds = [...new Set(ots.map((o) => o.motoId))];
    const motos = await prisma.moto.findMany({
      where: { id: { in: motoIds } },
      select: { id: true, patente: true, marca: true, modelo: true },
    });
    const motoMap = new Map(motos.map((m) => [m.id, m]));

    return ots.map((o) => {
      const moto = motoMap.get(o.motoId);
      return {
        numero: o.numero,
        tipo: o.tipo,
        estado: o.estado,
        prioridad: o.prioridad,
        descripcion: o.descripcion,
        fechaProgramada: o.fechaProgramada,
        tallerNombre: o.tallerNombre,
        motoPatente: moto?.patente ?? "N/A",
        motoMarca: moto?.marca,
        motoModelo: moto?.modelo,
      };
    });
  },
});

// 5. stock_bajo — uses raw query since Prisma can't compare columns
toolRegistry.registerTool({
  name: "stock_bajo",
  description: "Lista repuestos con stock bajo o agotado (stock <= stockMinimo).",
  module: "flota",
  allowedRoles: ["ADMIN", "OPERADOR"],
  parameters: z.object({}),
  execute: async () => {
    return prisma.$queryRaw`
      SELECT codigo, nombre, stock, "stockMinimo", categoria
      FROM repuestos
      WHERE activo = true AND stock <= "stockMinimo"
      ORDER BY stock ASC
      LIMIT 20
    `;
  },
});

// 6. buscar_embarques
toolRegistry.registerTool({
  name: "buscar_embarques",
  description:
    "Busca embarques de importación por estado. Muestra número, proveedor, estado, ETA.",
  module: "flota",
  allowedRoles: ["ADMIN", "OPERADOR"],
  parameters: z.object({
    estado: z.string().optional().describe("Estado del embarque"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const where: Record<string, unknown> = {};
    if (params.estado) where.estado = params.estado;
    return prisma.embarqueImportacion.findMany({
      where,
      select: {
        numero: true,
        proveedorNombre: true,
        estado: true,
        fechaEstimadaArribo: true,
        totalFOB: true,
        monedaFOB: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  },
});

// 7. buscar_ordenes_compra
toolRegistry.registerTool({
  name: "buscar_ordenes_compra",
  description: "Busca órdenes de compra por estado.",
  module: "flota",
  allowedRoles: ["ADMIN", "OPERADOR"],
  parameters: z.object({
    estado: z.string().optional().describe("Estado de la orden de compra"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const where: Record<string, unknown> = {};
    if (params.estado) where.estado = params.estado;
    return prisma.ordenCompra.findMany({
      where,
      select: {
        numero: true,
        estado: true,
        montoTotal: true,
        moneda: true,
        proveedor: { select: { nombre: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  },
});
