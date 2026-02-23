import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.hr.payroll.liquidate,
    "canView",
    ["ADMIN", "RRHH_MANAGER"]
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const periodo = searchParams.get("periodo");
  const empleadoId = searchParams.get("empleadoId");
  const estado = searchParams.get("estado");

  const where: Record<string, unknown> = {};
  if (periodo) where.periodo = periodo;
  if (empleadoId) where.empleadoId = empleadoId;
  if (estado) where.estado = estado;

  const recibos = await prisma.reciboSueldo.findMany({
    where,
    include: {
      empleado: {
        select: { nombre: true, apellido: true, legajo: true, departamento: true },
      },
    },
    orderBy: [{ periodo: "desc" }, { numero: "desc" }],
  });

  return NextResponse.json({ data: recibos });
}
