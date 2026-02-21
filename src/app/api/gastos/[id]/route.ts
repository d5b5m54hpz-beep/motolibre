import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.expense.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const gasto = await prisma.gasto.findUnique({ where: { id } });
  if (!gasto) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: gasto });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.expense.update,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const gasto = await prisma.gasto.findUnique({ where: { id } });
  if (!gasto) {
    return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
  }
  if (gasto.estado !== "PENDIENTE") {
    return NextResponse.json(
      { error: "Solo se pueden editar gastos pendientes" },
      { status: 422 }
    );
  }

  const body = await req.json();
  const updated = await prisma.gasto.update({
    where: { id },
    data: {
      descripcion: body.descripcion,
      monto: body.monto,
      categoria: body.categoria,
      medioPago: body.medioPago,
    },
  });

  return NextResponse.json({ data: updated });
}
