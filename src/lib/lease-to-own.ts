import { prisma } from "@/lib/prisma";
import { OPERATIONS } from "@/lib/events";

/**
 * Verifica contratos lease-to-own (24 meses) que tienen todas las cuotas pagadas
 * y ejecuta la transferencia automática de la moto.
 */
export async function procesarLeaseToOwn(userId?: string) {
  const contratos = await prisma.contrato.findMany({
    where: {
      esLeaseToOwn: true,
      estado: "ACTIVO",
      transferidaAt: null,
    },
    include: {
      cuotas: true,
      moto: true,
      cliente: true,
    },
  });

  const transferencias: string[] = [];

  for (const contrato of contratos) {
    const cuotasPendientes = contrato.cuotas.filter(
      (c) => c.estado === "PENDIENTE" || c.estado === "VENCIDA"
    );

    if (cuotasPendientes.length === 0 && contrato.cuotas.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.contrato.update({
          where: { id: contrato.id },
          data: {
            estado: "FINALIZADO_COMPRA",
            fechaFinReal: new Date(),
            fechaEjercicio: new Date(),
            transferidaAt: new Date(),
          },
        });

        await tx.moto.update({
          where: { id: contrato.motoId },
          data: { estado: "TRANSFERIDA" },
        });

        await tx.historialEstadoMoto.create({
          data: {
            motoId: contrato.motoId,
            estadoAnterior: "ALQUILADA",
            estadoNuevo: "TRANSFERIDA",
            motivo: `Lease-to-own completado — contrato ${contrato.id}, 24 meses cumplidos. Transferida a ${contrato.cliente.nombre} ${contrato.cliente.apellido} (DNI: ${contrato.cliente.dni})`,
            userId: userId ?? "system",
          },
        });

        await tx.mantenimientoProgramado.updateMany({
          where: {
            contratoId: contrato.id,
            estado: "PROGRAMADO",
          },
          data: { estado: "CANCELADO" },
        });

        await tx.businessEvent.create({
          data: {
            operationId: OPERATIONS.commercial.contract.finalizePurchase,
            entityType: "Contrato",
            entityId: contrato.id,
            userId: userId ?? "system",
            payload: {
              tipo: "lease-to-own-automatico",
              motoId: contrato.motoId,
              clienteId: contrato.clienteId,
              patente: contrato.moto.patente,
            },
          },
        });
      });

      transferencias.push(contrato.id);
    }
  }

  return transferencias;
}
