import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; repuestoId: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id, repuestoId } = await params;
  const body = await req.json();

  const subtotal = (body.cantidad ?? 1) * (body.precioUnitario ?? 0);

  const repuesto = await prisma.repuestoOrdenTrabajo.update({
    where: { id: repuestoId },
    data: {
      nombre: body.nombre,
      cantidad: body.cantidad,
      precioUnitario: body.precioUnitario,
      subtotal,
    },
  });

  // Recalcular costoRepuestos
  const totalRepuestos = await prisma.repuestoOrdenTrabajo.aggregate({
    where: { ordenTrabajoId: id },
    _sum: { subtotal: true },
  });

  await prisma.ordenTrabajo.update({
    where: { id },
    data: { costoRepuestos: Number(totalRepuestos._sum.subtotal ?? 0) },
  });

  return NextResponse.json({ data: repuesto });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; repuestoId: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id, repuestoId } = await params;

  await prisma.repuestoOrdenTrabajo.delete({ where: { id: repuestoId } });

  // Recalcular costoRepuestos
  const totalRepuestos = await prisma.repuestoOrdenTrabajo.aggregate({
    where: { ordenTrabajoId: id },
    _sum: { subtotal: true },
  });

  await prisma.ordenTrabajo.update({
    where: { id },
    data: { costoRepuestos: Number(totalRepuestos._sum.subtotal ?? 0) },
  });

  return NextResponse.json({ ok: true });
}
