import { prisma } from "@/lib/prisma";

/**
 * Recalcula costoManoObra, costoRepuestos y costoTotal de la OT
 * a partir de todos los ItemOT asociados.
 */
export async function recalcularCostosOT(ordenTrabajoId: string) {
  const items = await prisma.itemOT.findMany({
    where: { ordenTrabajoId },
  });

  let costoManoObra = 0;
  let costoRepuestos = 0;
  let costoInsumos = 0;

  for (const item of items) {
    const subtotal = Number(item.subtotal);
    switch (item.tipo) {
      case "MANO_OBRA":
        costoManoObra += subtotal;
        break;
      case "REPUESTO":
        costoRepuestos += subtotal;
        break;
      case "INSUMO":
        costoInsumos += subtotal;
        break;
    }
  }

  await prisma.ordenTrabajo.update({
    where: { id: ordenTrabajoId },
    data: {
      costoManoObra,
      costoRepuestos: costoRepuestos + costoInsumos,
      costoTotal: costoManoObra + costoRepuestos + costoInsumos,
    },
  });
}
