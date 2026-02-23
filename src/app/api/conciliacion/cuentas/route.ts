import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { apiSetup } from "@/lib/api-helpers";
import { cuentaBancariaSchema } from "@/lib/validations/conciliacion";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.import,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const data = await prisma.cuentaBancaria.findMany({
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.import,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = cuentaBancariaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cuenta = await prisma.cuentaBancaria.create({
    data: parsed.data,
  });

  const { eventBus } = await import("@/lib/events/event-bus");
  await eventBus.emit(
    OPERATIONS.finance.bankReconciliation.import,
    "CuentaBancaria",
    cuenta.id,
    { nombre: cuenta.nombre, banco: cuenta.banco },
    session?.user?.id
  );

  return NextResponse.json({ data: cuenta }, { status: 201 });
}
