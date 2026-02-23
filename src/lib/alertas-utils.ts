import { prisma } from "@/lib/prisma";
import type { TipoAlerta, PrioridadAlerta } from "@prisma/client";

interface CrearAlertaParams {
  tipo: TipoAlerta;
  prioridad?: PrioridadAlerta;
  titulo: string;
  mensaje: string;
  modulo: string;
  entidadTipo?: string;
  entidadId?: string;
  usuarioId: string;
  accionUrl?: string;
  accionLabel?: string;
}

/**
 * Crea una alerta para un usuario específico.
 * Fire-and-forget — nunca rompe el flujo principal.
 * Anti-duplicado: no crea si existe misma (tipo + entidadId + no leída) en 24hs.
 */
export async function crearAlerta(params: CrearAlertaParams): Promise<void> {
  try {
    // Evitar duplicados
    if (params.entidadId) {
      const existente = await prisma.alerta.findFirst({
        where: {
          tipo: params.tipo,
          entidadId: params.entidadId,
          leida: false,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (existente) return;
    }

    await prisma.alerta.create({
      data: {
        tipo: params.tipo,
        prioridad: params.prioridad ?? "MEDIA",
        titulo: params.titulo,
        mensaje: params.mensaje,
        modulo: params.modulo,
        entidadTipo: params.entidadTipo,
        entidadId: params.entidadId,
        usuarioId: params.usuarioId,
        accionUrl: params.accionUrl,
        accionLabel: params.accionLabel,
      },
    });
  } catch {
    console.error("[Alertas] Error creando alerta:", params.titulo);
  }
}

/**
 * Crea alerta para el usuario que creó una entidad.
 * Si no hay creador, busca primer admin como fallback.
 */
export async function alertarCreador(
  params: {
    entidadTipo: string;
    entidadId: string;
    creadorUserId?: string | null;
  } & Omit<CrearAlertaParams, "usuarioId" | "entidadTipo" | "entidadId">
): Promise<void> {
  let destinatarioId = params.creadorUserId;

  if (!destinatarioId) {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    destinatarioId = admin?.id;
  }

  if (!destinatarioId) return;

  await crearAlerta({
    ...params,
    entidadTipo: params.entidadTipo,
    entidadId: params.entidadId,
    usuarioId: destinatarioId,
  });
}

/**
 * Cuenta alertas no leídas de un usuario.
 */
export async function contarNoLeidas(usuarioId: string): Promise<number> {
  return prisma.alerta.count({
    where: { usuarioId, leida: false },
  });
}
