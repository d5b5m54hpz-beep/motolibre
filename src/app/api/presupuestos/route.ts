import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { presupuestoCreateSchema } from "@/lib/validations/presupuesto";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.budget.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const anio = Number(sp.get("anio") || new Date().getFullYear());
  const mes = Number(sp.get("mes") || new Date().getMonth() + 1);

  const presupuestos = await prisma.presupuestoMensual.findMany({
    where: { anio, mes },
    orderBy: { categoria: "asc" },
  });

  // También traer total ejecutado real de gastos aprobados del mes
  const gastosDelMes = await prisma.gasto.groupBy({
    by: ["categoria"],
    where: {
      estado: "APROBADO",
      fecha: {
        gte: new Date(anio, mes - 1, 1),
        lt: new Date(anio, mes, 1),
      },
    },
    _sum: { monto: true },
  });

  return NextResponse.json({ data: presupuestos, gastosDelMes, anio, mes });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.budget.create,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = presupuestoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const presupuesto = await prisma.presupuestoMensual.upsert({
    where: {
      anio_mes_categoria: {
        anio: parsed.data.anio,
        mes: parsed.data.mes,
        categoria: parsed.data.categoria,
      },
    },
    update: {
      montoPresupuestado: parsed.data.montoPresupuestado,
      notas: parsed.data.notas,
    },
    create: {
      anio: parsed.data.anio,
      mes: parsed.data.mes,
      categoria: parsed.data.categoria,
      montoPresupuestado: parsed.data.montoPresupuestado,
      notas: parsed.data.notas,
    },
  });

  return NextResponse.json({ data: presupuesto }, { status: 201 });
}
