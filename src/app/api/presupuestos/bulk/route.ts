import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { presupuestoBulkSchema } from "@/lib/validations/presupuesto";
import { apiSetup } from "@/lib/api-helpers";
import type { CategoriaGasto } from "@prisma/client";

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.budget.create,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = presupuestoBulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const results = await prisma.$transaction(
    parsed.data.items.map((item) =>
      prisma.presupuestoMensual.upsert({
        where: {
          anio_mes_categoria: {
            anio: parsed.data.anio,
            mes: parsed.data.mes,
            categoria: item.categoria as CategoriaGasto,
          },
        },
        update: { montoPresupuestado: item.montoPresupuestado },
        create: {
          anio: parsed.data.anio,
          mes: parsed.data.mes,
          categoria: item.categoria as CategoriaGasto,
          montoPresupuestado: item.montoPresupuestado,
        },
      })
    )
  );

  return NextResponse.json({ data: results, count: results.length }, { status: 201 });
}
