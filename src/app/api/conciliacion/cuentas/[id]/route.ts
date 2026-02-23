import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { apiSetup } from "@/lib/api-helpers";
import { cuentaBancariaSchema } from "@/lib/validations/conciliacion";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.import,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const cuenta = await prisma.cuentaBancaria.findUnique({
    where: { id },
    include: {
      extractos: {
        take: 10,
        orderBy: { fecha: "desc" },
      },
      conciliaciones: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!cuenta) {
    return NextResponse.json({ error: "Cuenta bancaria no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: cuenta });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.finance.bankReconciliation.import,
    "canCreate",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = cuentaBancariaSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.cuentaBancaria.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Cuenta bancaria no encontrada" }, { status: 404 });
  }

  const cuenta = await prisma.cuentaBancaria.update({
    where: { id },
    data: parsed.data,
  });

  const { eventBus } = await import("@/lib/events/event-bus");
  await eventBus.emit(
    OPERATIONS.finance.bankReconciliation.import,
    "CuentaBancaria",
    cuenta.id,
    { nombre: cuenta.nombre, banco: cuenta.banco, accion: "actualizar" },
    session?.user?.id
  );

  return NextResponse.json({ data: cuenta });
}
