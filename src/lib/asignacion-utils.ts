import { prisma } from "@/lib/prisma";
import { OPERATIONS } from "@/lib/events";

/**
 * Intenta asignar motos disponibles a solicitudes en espera.
 * Retorna las asignaciones realizadas.
 */
export async function procesarAsignacionesPendientes(userId?: string) {
  const solicitudesEnEspera = await prisma.solicitud.findMany({
    where: { estado: "EN_ESPERA" },
    orderBy: [{ prioridadEspera: "asc" }, { createdAt: "asc" }],
  });

  if (solicitudesEnEspera.length === 0) return [];

  const asignaciones: Array<{ solicitudId: string; motoId: string }> = [];

  for (const solicitud of solicitudesEnEspera) {
    const motoDisponible = await prisma.moto.findFirst({
      where: {
        marca: solicitud.marcaDeseada,
        modelo: solicitud.modeloDeseado,
        estado: "DISPONIBLE",
      },
      orderBy: { createdAt: "asc" },
    });

    if (!motoDisponible) continue;

    await prisma.$transaction(async (tx) => {
      await tx.solicitud.update({
        where: { id: solicitud.id },
        data: {
          estado: "ASIGNADA",
          motoAsignadaId: motoDisponible.id,
          fechaAsignacion: new Date(),
        },
      });

      await tx.moto.update({
        where: { id: motoDisponible.id },
        data: { estado: "RESERVADA" },
      });

      await tx.historialEstadoMoto.create({
        data: {
          motoId: motoDisponible.id,
          estadoAnterior: "DISPONIBLE",
          estadoNuevo: "RESERVADA",
          motivo: `Asignada automáticamente a solicitud ${solicitud.id}`,
          userId: userId ?? "system",
        },
      });

      await tx.businessEvent.create({
        data: {
          operationId: OPERATIONS.solicitud.assignMoto,
          entityType: "Solicitud",
          entityId: solicitud.id,
          userId: userId ?? "system",
          payload: {
            motoId: motoDisponible.id,
            marca: motoDisponible.marca,
            modelo: motoDisponible.modelo,
            patente: motoDisponible.patente,
          },
        },
      });
    });

    asignaciones.push({ solicitudId: solicitud.id, motoId: motoDisponible.id });
  }

  return asignaciones;
}

/**
 * Se llama cada vez que una moto pasa a DISPONIBLE.
 * Verifica si hay alguien en la cola para ese modelo.
 */
export async function verificarColaAlLiberar(motoId: string, userId?: string) {
  const moto = await prisma.moto.findUnique({ where: { id: motoId } });
  if (!moto || moto.estado !== "DISPONIBLE") return null;

  const solicitud = await prisma.solicitud.findFirst({
    where: {
      estado: "EN_ESPERA",
      marcaDeseada: moto.marca,
      modeloDeseado: moto.modelo,
    },
    orderBy: [{ prioridadEspera: "asc" }, { createdAt: "asc" }],
  });

  if (!solicitud) return null;

  await prisma.$transaction(async (tx) => {
    await tx.solicitud.update({
      where: { id: solicitud.id },
      data: {
        estado: "ASIGNADA",
        motoAsignadaId: moto.id,
        fechaAsignacion: new Date(),
      },
    });

    await tx.moto.update({
      where: { id: moto.id },
      data: { estado: "RESERVADA" },
    });

    await tx.historialEstadoMoto.create({
      data: {
        motoId: moto.id,
        estadoAnterior: "DISPONIBLE",
        estadoNuevo: "RESERVADA",
        motivo: `Asignada automáticamente a solicitud ${solicitud.id}`,
        userId: userId ?? "system",
      },
    });

    await tx.businessEvent.create({
      data: {
        operationId: OPERATIONS.solicitud.assignMoto,
        entityType: "Solicitud",
        entityId: solicitud.id,
        userId: userId ?? "system",
        payload: { motoId: moto.id, marca: moto.marca, modelo: moto.modelo },
      },
    });
  });

  return { solicitudId: solicitud.id, motoId: moto.id };
}
