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

  const desde = sp.get("desde")
    ? new Date(sp.get("desde")!)
    : new Date(anio, mes - 1, 1);
  const hasta = sp.get("hasta")
    ? new Date(sp.get("hasta")!)
    : new Date(anio, mes, 0, 23, 59, 59);

  // Get all cuentas for mapping
  const cuentas = await prisma.cuentaContable.findMany({
    select: { id: true, codigo: true },
  });
  const idToCodigo = Object.fromEntries(cuentas.map((c) => [c.id, c.codigo]));

  // Get all lineas for the period, grouped by cuenta
  const movimientos = await prisma.lineaAsiento.groupBy({
    by: ["cuentaId"],
    where: {
      asiento: {
        fecha: { gte: desde, lte: hasta },
      },
    },
    _sum: { debe: true, haber: true },
  });

  // Map to sums by code
  const sumByCodigo: Record<string, { debe: number; haber: number }> = {};
  for (const m of movimientos) {
    const codigo = idToCodigo[m.cuentaId];
    if (codigo) {
      sumByCodigo[codigo] = {
        debe: Number(m._sum.debe ?? 0),
        haber: Number(m._sum.haber ?? 0),
      };
    }
  }

  function haberOf(code: string) {
    return sumByCodigo[code]?.haber ?? 0;
  }
  function debeOf(code: string) {
    return sumByCodigo[code]?.debe ?? 0;
  }

  const ingresos = {
    alquiler: haberOf(CUENTAS.INGRESOS_ALQUILER),
    ventaMotos: haberOf(CUENTAS.INGRESOS_VENTA_MOTOS),
    repuestos: haberOf(CUENTAS.INGRESOS_REPUESTOS),
    otros: haberOf(CUENTAS.OTROS_INGRESOS),
    total: 0,
  };
  ingresos.total = ingresos.alquiler + ingresos.ventaMotos + ingresos.repuestos + ingresos.otros;

  const costos = {
    depreciacion: debeOf(CUENTAS.COSTO_DEPRECIACION),
    mantenimiento: debeOf(CUENTAS.GASTOS_MANTENIMIENTO),
    seguros: debeOf(CUENTAS.GASTOS_SEGUROS),
    total: 0,
  };
  costos.total = costos.depreciacion + costos.mantenimiento + costos.seguros;

  const resultadoBruto = ingresos.total - costos.total;

  const gastos = {
    administrativos: debeOf(CUENTAS.GASTOS_ADMINISTRATIVOS),
    bancarios: debeOf(CUENTAS.GASTOS_BANCARIOS),
    impuestos: debeOf(CUENTAS.GASTOS_IMPUESTOS),
    otros: debeOf(CUENTAS.OTROS_EGRESOS),
    total: 0,
  };
  gastos.total = gastos.administrativos + gastos.bancarios + gastos.impuestos + gastos.otros;

  const resultadoNeto = resultadoBruto - gastos.total;

  return NextResponse.json({
    data: {
      periodo: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      ingresos,
      costos,
      resultadoBruto,
      gastos,
      resultadoNeto,
    },
  });
}
