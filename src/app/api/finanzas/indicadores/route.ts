import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.report.view,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    totalMotos,
    motosAlquiladas,
    ingresosMes,
    gastosMes,
    cuotasTotal,
    cuotasVencidas,
    cuotasPagadas,
    totalFacturadoMes,
    totalCobradoMes,
    presupuestos,
  ] = await Promise.all([
    prisma.moto.count(),
    prisma.moto.count({ where: { estado: "ALQUILADA" } }),
    prisma.pagoMercadoPago.aggregate({
      where: { estado: "APROBADO", fechaPago: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    }),
    prisma.gasto.aggregate({
      where: { estado: "APROBADO", fecha: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    }),
    prisma.cuota.count(),
    prisma.cuota.count({
      where: { estado: "PENDIENTE", fechaVencimiento: { lt: now } },
    }),
    prisma.cuota.findMany({
      where: { estado: "PAGADA", fechaPago: { not: null } },
      select: { fechaVencimiento: true, fechaPago: true },
    }),
    prisma.factura.aggregate({
      where: { fechaEmision: { gte: inicioMes, lte: finMes }, estado: { not: "ANULADA" } },
      _sum: { montoTotal: true },
    }),
    prisma.pagoMercadoPago.aggregate({
      where: { estado: "APROBADO", fechaPago: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    }),
    prisma.presupuestoMensual.findMany({
      where: { anio: now.getFullYear(), mes: now.getMonth() + 1 },
    }),
  ]);

  const ingreso = Number(ingresosMes._sum.monto ?? 0);
  const gasto = Number(gastosMes._sum.monto ?? 0);

  // Operativos
  const ingresoPorMoto = motosAlquiladas > 0 ? ingreso / motosAlquiladas : 0;
  const gastoPromedioPorMoto = totalMotos > 0 ? gasto / totalMotos : 0;
  const margenOperativo = ingreso > 0 ? ((ingreso - gasto) / ingreso) * 100 : 0;
  const tasaOcupacion = totalMotos > 0 ? (motosAlquiladas / totalMotos) * 100 : 0;

  // Cobranza
  const tasaMorosidad = cuotasTotal > 0 ? (cuotasVencidas / cuotasTotal) * 100 : 0;

  // Dias promedio cobro
  let diasPromedioCobro = 0;
  if (cuotasPagadas.length > 0) {
    const totalDias = cuotasPagadas.reduce((sum, c) => {
      if (!c.fechaPago) return sum;
      const diff = (c.fechaPago.getTime() - c.fechaVencimiento.getTime()) / 86400000;
      return sum + Math.max(0, diff);
    }, 0);
    diasPromedioCobro = totalDias / cuotasPagadas.length;
  }

  const facturado = Number(totalFacturadoMes._sum.montoTotal ?? 0);
  const cobrado = Number(totalCobradoMes._sum.monto ?? 0);
  const recaudacionVsFacturado = facturado > 0 ? (cobrado / facturado) * 100 : 0;

  // Rentabilidad
  const resultadoNeto = ingreso - gasto;
  const margenNeto = ingreso > 0 ? (resultadoNeto / ingreso) * 100 : 0;
  const roi = 0; // Would need total assets calculation

  // Presupuesto
  const totalPresupuestado = presupuestos.reduce(
    (s, p) => s + Number(p.montoPresupuestado), 0
  );
  const totalEjecutado = presupuestos.reduce(
    (s, p) => s + Number(p.montoEjecutado), 0
  );
  const ejecucionPresupuestaria =
    totalPresupuestado > 0 ? (totalEjecutado / totalPresupuestado) * 100 : 0;
  const desvioPresupuestario =
    totalPresupuestado > 0
      ? ((totalEjecutado - totalPresupuestado) / totalPresupuestado) * 100
      : 0;

  return NextResponse.json({
    data: {
      ingresoPorMoto,
      gastoPromedioPorMoto,
      margenOperativo,
      tasaOcupacion,
      tasaMorosidad,
      diasPromedioCobro,
      recaudacionVsFacturado,
      roi,
      margenNeto,
      ejecucionPresupuestaria,
      desvioPresupuestario,
    },
  });
}
