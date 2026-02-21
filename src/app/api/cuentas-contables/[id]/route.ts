import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.accounting.account.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const cuenta = await prisma.cuentaContable.findUnique({
    where: { id },
    include: {
      padre: { select: { id: true, codigo: true, nombre: true } },
      hijos: {
        select: { id: true, codigo: true, nombre: true, tipo: true, nivel: true, aceptaMovimientos: true },
        orderBy: { codigo: "asc" },
      },
      lineasAsiento: {
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          asiento: { select: { id: true, numero: true, fecha: true, tipo: true, descripcion: true } },
        },
      },
      _count: { select: { lineasAsiento: true } },
    },
  });

  if (!cuenta) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: cuenta });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.accounting.account.update,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const cuenta = await prisma.cuentaContable.findUnique({ where: { id } });
  if (!cuenta) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  const updated = await withEvent(
    OPERATIONS.accounting.account.update,
    "CuentaContable",
    () =>
      prisma.cuentaContable.update({
        where: { id },
        data: {
          nombre: body.nombre ?? cuenta.nombre,
          descripcion: body.descripcion !== undefined ? body.descripcion : cuenta.descripcion,
          activa: body.activa !== undefined ? body.activa : cuenta.activa,
        },
      }),
    userId
  );

  return NextResponse.json({ data: updated });
}
