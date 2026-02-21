import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { calcularSaldoCuenta, CUENTAS } from "@/lib/contabilidad-utils";
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
  const inicioMesAnt = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const finMesAnt = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Get cuenta IDs for saldo calculations
  const cuentas = await prisma.cuentaContable.findMany({
    where: {
      codigo: {
        in: [
          CUENTAS.CAJA, CUENTAS.BANCO_MP, CUENTAS.BANCO_BIND,
          CUENTAS.CUENTAS_COBRAR, CUENTAS.PROVEEDORES,
        ],
      },
    },
  });
  const cuentaMap: Record<string, string> = {};
  for (const c of cuentas) cuentaMap[c.codigo] = c.id;

  async function saldo(codigo: string): Promise<number> {
    const id = cuentaMap[codigo];
    return id ? calcularSaldoCuenta(id) : 0;
  }

  // Calculate balances in parallel
  const [saldoCaja, saldoMP, saldoBanco, cuentasPorCobrar, cuentasPorPagar] =
    await Promise.all([
      saldo(CUENTAS.CAJA),
      saldo(CUENTAS.BANCO_MP),
      saldo(CUENTAS.BANCO_BIND),
      saldo(CUENTAS.CUENTAS_COBRAR),
      saldo(CUENTAS.PROVEEDORES),
    ]);

  // Revenue: approved payments this month and last month
  const [ingresosMes, ingresosMesAnterior, egresosMes, egresosMesAnterior] =
    await Promise.all([
      prisma.pagoMercadoPago.aggregate({
        where: { estado: "APROBADO", fechaPago: { gte: inicioMes, lte: finMes } },
        _sum: { monto: true },
      }),
      prisma.pagoMercadoPago.aggregate({
        where: { estado: "APROBADO", fechaPago: { gte: inicioMesAnt, lte: finMesAnt } },
        _sum: { monto: true },
      }),
      prisma.gasto.aggregate({
        where: { estado: "APROBADO", fecha: { gte: inicioMes, lte: finMes } },
        _sum: { monto: true },
      }),
      prisma.gasto.aggregate({
        where: { estado: "APROBADO", fecha: { gte: inicioMesAnt, lte: finMesAnt } },
        _sum: { monto: true },
      }),
    ]);

  const ingMes = Number(ingresosMes._sum.monto ?? 0);
  const ingMesAnt = Number(ingresosMesAnterior._sum.monto ?? 0);
  const egrMes = Number(egresosMes._sum.monto ?? 0);
  const egrMesAnt = Number(egresosMesAnterior._sum.monto ?? 0);

  // Facturas emitidas este mes
  const [facturasEmitidas, totalFacturado] = await Promise.all([
    prisma.factura.count({ where: { fechaEmision: { gte: inicioMes, lte: finMes } } }),
    prisma.factura.aggregate({
      where: { fechaEmision: { gte: inicioMes, lte: finMes }, estado: { not: "ANULADA" } },
      _sum: { montoTotal: true },
    }),
  ]);

  const data = {
    ingresosMes: ingMes,
    ingresosMesAnterior: ingMesAnt,
    variacionIngresos: ingMesAnt > 0 ? ((ingMes - ingMesAnt) / ingMesAnt) * 100 : 0,
    egresosMes: egrMes,
    egresosMesAnterior: egrMesAnt,
    variacionEgresos: egrMesAnt > 0 ? ((egrMes - egrMesAnt) / egrMesAnt) * 100 : 0,
    resultadoNeto: ingMes - egrMes,
    resultadoMesAnterior: ingMesAnt - egrMesAnt,
    saldoCaja,
    saldoMP,
    saldoBanco,
    cuentasPorCobrar,
    cuentasPorPagar,
    facturasEmitidasMes: facturasEmitidas,
    totalFacturadoMes: Number(totalFacturado._sum.montoTotal ?? 0),
  };

  return NextResponse.json({ data });
}
