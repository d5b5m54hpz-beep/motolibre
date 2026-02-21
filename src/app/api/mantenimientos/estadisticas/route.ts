import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    otActivas,
    otCompletadasMes,
    costoTotalMes,
    otPorMoto,
    otPorTipo,
    otCompletadasConFechas,
  ] = await Promise.all([
    // OTs no completadas/canceladas
    prisma.ordenTrabajo.count({
      where: { estado: { notIn: ["COMPLETADA", "CANCELADA"] } },
    }),

    // Completadas este mes
    prisma.ordenTrabajo.count({
      where: {
        estado: "COMPLETADA",
        fechaFinReal: { gte: inicioMes, lte: finMes },
      },
    }),

    // Costo total del mes
    prisma.ordenTrabajo.aggregate({
      where: {
        estado: "COMPLETADA",
        fechaFinReal: { gte: inicioMes, lte: finMes },
      },
      _sum: { costoTotal: true },
    }),

    // OTs por moto (todas)
    prisma.ordenTrabajo.groupBy({
      by: ["motoId"],
      where: { estado: "COMPLETADA" },
      _count: true,
      _sum: { costoTotal: true },
    }),

    // OTs del mes por tipo
    prisma.ordenTrabajo.groupBy({
      by: ["tipo"],
      where: {
        createdAt: { gte: inicioMes, lte: finMes },
      },
      _count: true,
    }),

    // Para tiempo promedio de resolución
    prisma.ordenTrabajo.findMany({
      where: {
        estado: "COMPLETADA",
        fechaFinReal: { gte: inicioMes, lte: finMes },
        fechaInicioReal: { not: null },
      },
      select: { fechaSolicitud: true, fechaFinReal: true },
    }),
  ]);

  // Enriquecer costoPorMoto con datos de la moto
  const motoIds = otPorMoto.map((o) => o.motoId);
  const motos = await prisma.moto.findMany({
    where: { id: { in: motoIds } },
    select: { id: true, patente: true, marca: true, modelo: true },
  });
  const motoMap = new Map(motos.map((m) => [m.id, m]));

  const costoPorMoto = otPorMoto.map((o) => {
    const moto = motoMap.get(o.motoId);
    return {
      motoId: o.motoId,
      patente: moto?.patente ?? "-",
      marca: moto?.marca ?? "-",
      modelo: moto?.modelo ?? "-",
      otCount: o._count,
      costoTotal: Number(o._sum.costoTotal ?? 0),
    };
  });

  // Distribución por tipo
  const tipoMap: Record<string, number> = {};
  for (const t of otPorTipo) {
    tipoMap[t.tipo] = t._count;
  }

  // Tiempo promedio resolución (días)
  let tiempoPromedioResolucion = 0;
  if (otCompletadasConFechas.length > 0) {
    const totalDias = otCompletadasConFechas.reduce((sum, ot) => {
      if (!ot.fechaFinReal) return sum;
      const diff = ot.fechaFinReal.getTime() - ot.fechaSolicitud.getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    tiempoPromedioResolucion = totalDias / otCompletadasConFechas.length;
  }

  return NextResponse.json({
    data: {
      otActivas,
      otCompletadasMes,
      costoTotalMes: Number(costoTotalMes._sum.costoTotal ?? 0),
      costoPorMoto,
      distribucionPorTipo: {
        preventivo: tipoMap["PREVENTIVO"] ?? 0,
        correctivo: tipoMap["CORRECTIVO"] ?? 0,
        emergencia: tipoMap["EMERGENCIA"] ?? 0,
      },
      tiempoPromedioResolucion,
    },
  });
}
