import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { CUENTAS } from "@/lib/contabilidad-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.report.view,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const anio = Number(sp.get("anio") || now.getFullYear());
  const mes = Number(sp.get("mes") || now.getMonth() + 1);

  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 0, 23, 59, 59);
  const antesDelPeriodo = new Date(anio, mes - 1, 0, 23, 59, 59); // last day of previous month

  // Cash accounts
  const cashCodes = [CUENTAS.CAJA, CUENTAS.BANCO_MP, CUENTAS.BANCO_BIND];
  const cuentasCash = await prisma.cuentaContable.findMany({
    where: { codigo: { in: cashCodes } },
    select: { id: true, codigo: true },
  });
  const cashIds = cuentasCash.map((c) => c.id);

  // Saldo inicial: sum of cash accounts at end of previous period
  const saldoInicialAgg = await prisma.lineaAsiento.aggregate({
    where: {
      cuentaId: { in: cashIds },
      asiento: { fecha: { lte: antesDelPeriodo } },
    },
    _sum: { debe: true, haber: true },
  });
  const saldoInicial =
    Number(saldoInicialAgg._sum.debe ?? 0) - Number(saldoInicialAgg._sum.haber ?? 0);

  // Get all cash movements in the period with asiento details
  const lineas = await prisma.lineaAsiento.findMany({
    where: {
      cuentaId: { in: cashIds },
      asiento: { fecha: { gte: desde, lte: hasta } },
    },
    include: {
      asiento: { select: { fecha: true, tipo: true } },
    },
    orderBy: { asiento: { fecha: "asc" } },
  });

  // Classify: DEBE in cash = entry, HABER in cash = exit
  let cobrosAlquiler = 0;
  let otrosIngresos = 0;
  let pagosProveedores = 0;
  let gastosOp = 0;
  let refunds = 0;

  // Daily aggregation
  const dailyMap: Record<string, { entradas: number; salidas: number }> = {};

  for (const l of lineas) {
    const dateStr = l.asiento.fecha.toISOString().slice(0, 10);
    if (!dailyMap[dateStr]) dailyMap[dateStr] = { entradas: 0, salidas: 0 };

    const debe = Number(l.debe);
    const haber = Number(l.haber);

    if (debe > 0) {
      // Entry into cash
      dailyMap[dateStr].entradas += debe;
      if (l.asiento.tipo === "VENTA") {
        cobrosAlquiler += debe;
      } else {
        otrosIngresos += debe;
      }
    }
    if (haber > 0) {
      // Exit from cash
      dailyMap[dateStr].salidas += haber;
      if (l.asiento.tipo === "COMPRA") {
        pagosProveedores += haber;
      } else if (l.asiento.tipo === "AJUSTE") {
        refunds += haber;
      } else {
        gastosOp += haber;
      }
    }
  }

  const entradasTotal = cobrosAlquiler + otrosIngresos;
  const salidasTotal = pagosProveedores + gastosOp + refunds;
  const flujoNeto = entradasTotal - salidasTotal;

  // Build daily array
  const diario: Array<{ fecha: string; entradas: number; salidas: number; saldo: number }> = [];
  let saldoAcum = saldoInicial;
  const daysInMonth = new Date(anio, mes, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${anio}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const day = dailyMap[dateStr] || { entradas: 0, salidas: 0 };
    saldoAcum += day.entradas - day.salidas;
    diario.push({
      fecha: dateStr,
      entradas: day.entradas,
      salidas: day.salidas,
      saldo: saldoAcum,
    });
  }

  return NextResponse.json({
    data: {
      periodo: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      saldoInicial,
      entradas: {
        cobrosAlquiler,
        otrosIngresos,
        total: entradasTotal,
      },
      salidas: {
        pagosProveedores,
        gastos: gastosOp,
        refunds,
        total: salidasTotal,
      },
      flujoNeto,
      saldoFinal: saldoInicial + flujoNeto,
      diario,
    },
  });
}
