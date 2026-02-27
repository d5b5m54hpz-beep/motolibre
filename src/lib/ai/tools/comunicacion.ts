import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toolRegistry } from "../tool-registry";

// 23. bandeja_comunicacion
toolRegistry.registerTool({
  name: "bandeja_comunicacion",
  description:
    "Resumen de la bandeja de comunicación: conversaciones abiertas, mensajes pendientes de aprobación, y actividad reciente.",
  module: "comunicacion",
  allowedRoles: ["ADMIN", "COMERCIAL", "OPERADOR"],
  parameters: z.object({}),
  execute: async () => {
    const [abiertas, resueltas, archivadas, pendientesAprobacion, recientes] =
      await Promise.all([
        prisma.conversacion.count({ where: { estado: "ABIERTA" } }),
        prisma.conversacion.count({ where: { estado: "RESUELTA" } }),
        prisma.conversacion.count({ where: { estado: "ARCHIVADA" } }),
        prisma.aprobacionMensaje.count({ where: { estado: "PENDIENTE" } }),
        prisma.conversacion.findMany({
          where: { estado: "ABIERTA" },
          select: {
            asunto: true,
            prioridad: true,
            updatedAt: true,
            mensajes: {
              select: { createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 5,
        }),
      ]);

    return {
      resumen: {
        conversacionesAbiertas: abiertas,
        conversacionesResueltas: resueltas,
        conversacionesArchivadas: archivadas,
        mensajesPendientesAprobacion: pendientesAprobacion,
      },
      conversacionesRecientes: recientes.map((c) => ({
        asunto: c.asunto,
        prioridad: c.prioridad,
        ultimaActividad: c.updatedAt.toISOString().split("T")[0],
      })),
    };
  },
});

// 24. mensajes_pendientes_aprobacion
toolRegistry.registerTool({
  name: "mensajes_pendientes_aprobacion",
  description:
    "Lista los mensajes salientes que están esperando aprobación del CEO/admin para ser enviados.",
  module: "comunicacion",
  allowedRoles: ["ADMIN"],
  parameters: z.object({
    limite: z.number().default(10).describe("Máximo de resultados"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const aprobaciones = await prisma.aprobacionMensaje.findMany({
      where: { estado: "PENDIENTE" },
      select: {
        id: true,
        createdAt: true,
        mensaje: {
          select: {
            asunto: true,
            para: true,
            cuerpo: true,
            conversacion: {
              select: { asunto: true, prioridad: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: (params.limite as number) || 10,
    });

    return {
      totalPendientes: aprobaciones.length,
      mensajes: aprobaciones.map((a) => ({
        aprobacionId: a.id,
        asunto: a.mensaje.asunto,
        para: a.mensaje.para,
        conversacion: a.mensaje.conversacion.asunto,
        prioridad: a.mensaje.conversacion.prioridad,
        esperandoDesde: a.createdAt.toISOString().split("T")[0],
        extractoCuerpo: a.mensaje.cuerpo.slice(0, 200),
      })),
    };
  },
});

// 25. conversaciones_activas
toolRegistry.registerTool({
  name: "conversaciones_activas",
  description:
    "Lista conversaciones abiertas con su asunto, prioridad y cantidad de mensajes.",
  module: "comunicacion",
  allowedRoles: ["ADMIN", "COMERCIAL", "OPERADOR"],
  parameters: z.object({
    prioridad: z
      .enum(["ALTA", "MEDIA", "BAJA"])
      .optional()
      .describe("Filtrar por prioridad"),
    limite: z.number().default(15).describe("Máximo de resultados"),
  }),
  execute: async (params: Record<string, unknown>) => {
    const where: Record<string, unknown> = { estado: "ABIERTA" };
    if (params.prioridad) {
      where.prioridad = params.prioridad;
    }

    const conversaciones = await prisma.conversacion.findMany({
      where,
      select: {
        asunto: true,
        prioridad: true,
        etiquetas: true,
        updatedAt: true,
        _count: { select: { mensajes: true } },
      },
      orderBy: [{ prioridad: "asc" }, { updatedAt: "desc" }],
      take: (params.limite as number) || 15,
    });

    return conversaciones.map((c) => ({
      asunto: c.asunto,
      prioridad: c.prioridad,
      etiquetas: c.etiquetas,
      mensajes: c._count.mensajes,
      ultimaActividad: c.updatedAt.toISOString().split("T")[0],
    }));
  },
});
