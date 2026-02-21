import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { repuestoOTCreateSchema } from "@/lib/validations/orden-trabajo";
import { registrarMovimiento } from "@/lib/stock-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const repuestos = await prisma.repuestoOrdenTrabajo.findMany({
    where: { ordenTrabajoId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: repuestos });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, session } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = repuestoOTCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const subtotal = parsed.data.cantidad * parsed.data.precioUnitario;

  // If linked to inventory, verify stock and egress
  if (parsed.data.repuestoId) {
    const inv = await prisma.repuesto.findUnique({ where: { id: parsed.data.repuestoId } });
    if (!inv) {
      return NextResponse.json({ error: "Repuesto de inventario no encontrado" }, { status: 404 });
    }
    if (inv.stock < parsed.data.cantidad) {
      return NextResponse.json(
        { error: `Stock insuficiente. Disponible: ${inv.stock}, requerido: ${parsed.data.cantidad}` },
        { status: 400 }
      );
    }
    await registrarMovimiento({
      repuestoId: parsed.data.repuestoId,
      tipo: "EGRESO",
      cantidad: parsed.data.cantidad,
      descripcion: `Uso en OT ${id}`,
      costoUnitario: parsed.data.precioUnitario,
      referenciaTipo: "OrdenTrabajo",
      referenciaId: id,
      userId: session?.user?.id,
    });
  }

  const repuesto = await prisma.repuestoOrdenTrabajo.create({
    data: {
      ordenTrabajoId: id,
      nombre: parsed.data.nombre,
      cantidad: parsed.data.cantidad,
      precioUnitario: parsed.data.precioUnitario,
      subtotal,
      repuestoId: parsed.data.repuestoId ?? undefined,
    },
  });

  // Recalcular costoRepuestos en la OT
  const totalRepuestos = await prisma.repuestoOrdenTrabajo.aggregate({
    where: { ordenTrabajoId: id },
    _sum: { subtotal: true },
  });

  await prisma.ordenTrabajo.update({
    where: { id },
    data: {
      costoRepuestos: Number(totalRepuestos._sum.subtotal ?? 0),
    },
  });

  return NextResponse.json({ data: repuesto }, { status: 201 });
}
