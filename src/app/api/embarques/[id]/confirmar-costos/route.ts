import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, eventBus } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { calcularTotalNacionalizado, distribuirCostosPorItem } from "@/lib/importacion-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.supply.shipment.confirmCosts,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const embarque = await prisma.embarqueImportacion.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!embarque) {
    return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
  }
  if (embarque.estado !== "DESPACHADO") {
    return NextResponse.json(
      { error: "El embarque debe estar DESPACHADO para confirmar costos" },
      { status: 400 }
    );
  }

  const totalFOB = Number(embarque.totalFOB);
  const tipoCambio = Number(embarque.tipoCambio || 0);
  const totalCIF = Number(embarque.totalCIF || 0);

  const totalNacionalizado = calcularTotalNacionalizado({
    cifUSD: totalCIF,
    tipoCambio,
    derechosImportacion: Number(embarque.derechosImportacion || 0),
    tasaEstadistica: Number(embarque.tasaEstadistica || 0),
    ivaImportacion: Number(embarque.ivaImportacion || 0),
    ivaAdicional: Number(embarque.ivaAdicional || 0),
    ingresosBrutos: Number(embarque.ingresosBrutos || 0),
    gastosDespacho: Number(embarque.gastosDespacho || 0),
  });

  // Distribuir costos proporcionalmente al FOB de cada item
  const itemsForDistrib = embarque.items.map((i) => ({
    id: i.id,
    subtotalFOB: Number(i.subtotalFOB),
    cantidad: i.cantidad,
  }));

  const distribucion = distribuirCostosPorItem(itemsForDistrib, totalFOB, totalNacionalizado);

  // Actualizar items + crear asignaciones en transacción
  await prisma.$transaction(async (tx) => {
    for (const d of distribucion) {
      await tx.itemEmbarque.update({
        where: { id: d.itemId },
        data: {
          costoNacionalizadoUnit: d.costoNacionalizadoUnit,
          costoNacionalizadoTotal: d.costoNacionalizadoTotal,
        },
      });

      await tx.asignacionCostoImportacion.create({
        data: {
          embarqueId: id,
          itemEmbarqueId: d.itemId,
          porcentajeFOB: d.porcentajeFOB,
          costoAsignado: d.costoNacionalizadoTotal,
        },
      });
    }

    await tx.embarqueImportacion.update({
      where: { id },
      data: {
        estado: "COSTOS_FINALIZADOS",
        totalNacionalizado,
      },
    });
  });

  // Emit confirmCosts event → handler contable (Merc.Tránsito | Prov.Exterior)
  await eventBus.emit(
    OPERATIONS.supply.shipment.confirmCosts,
    "EmbarqueImportacion",
    id,
    { totalFOB, tipoCambio, totalNacionalizado },
    userId
  );

  return NextResponse.json({
    totalNacionalizado,
    distribucion,
  });
}
