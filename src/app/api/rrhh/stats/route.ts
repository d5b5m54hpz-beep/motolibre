import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.hr.employee.create,
    "canView",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    empleadosActivos,
    porDepartamento,
    masaSalarial,
    ausenciasEsteMes,
    recibosMes,
  ] = await Promise.all([
    prisma.empleado.count({ where: { estado: "ACTIVO" } }),
    prisma.empleado.groupBy({
      by: ["departamento"],
      where: { estado: "ACTIVO" },
      _count: true,
    }),
    prisma.empleado.aggregate({
      where: { estado: "ACTIVO" },
      _sum: { sueldoBasico: true },
    }),
    prisma.ausencia.count({
      where: {
        fechaDesde: { gte: primerDiaMes },
        fechaHasta: { lte: ultimoDiaMes },
        estado: { in: ["APROBADA", "SOLICITADA"] },
      },
    }),
    prisma.reciboSueldo.aggregate({
      where: { periodo: mesActual, estado: { in: ["LIQUIDADO", "PAGADO"] } },
      _sum: { costoTotalEmpleador: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    data: {
      empleadosActivos,
      porDepartamento: porDepartamento.map((d) => ({
        depto: d.departamento,
        count: d._count,
      })),
      masaSalarial: Number(masaSalarial._sum.sueldoBasico || 0),
      ausenciasEsteMes,
      liquidacionesPendientes:
        empleadosActivos - (recibosMes._count || 0),
      costoTotalMes: Number(recibosMes._sum.costoTotalEmpleador || 0),
    },
  });
}
