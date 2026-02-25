import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { itemOTUpdateSchema } from "@/lib/validations/orden-trabajo";
import { calcularCostoHoraMecanico } from "@/lib/services/costo-mecanico";
import { apiSetup } from "@/lib/api-helpers";
import { recalcularCostosOT } from "@/lib/services/recalcular-costos-ot";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id, itemId } = await params;

  // Verify OT is editable
  const ot = await prisma.ordenTrabajo.findUnique({ where: { id } });
  if (!ot) {
    return NextResponse.json({ error: "OT no encontrada" }, { status: 404 });
  }
  if (ot.estado === "COMPLETADA" || ot.estado === "CANCELADA") {
    return NextResponse.json(
      { error: "No se puede modificar una OT completada o cancelada" },
      { status: 400 }
    );
  }

  const existing = await prisma.itemOT.findUnique({ where: { id: itemId } });
  if (!existing || existing.ordenTrabajoId !== id) {
    return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = itemOTUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let precioUnitario = parsed.data.precioUnitario ?? Number(existing.precioUnitario);
  const cantidad = parsed.data.cantidad ?? existing.cantidad;
  const mecanicoId = parsed.data.mecanicoId !== undefined ? parsed.data.mecanicoId : existing.mecanicoId;
  const tiempoMinutos = parsed.data.tiempoMinutos !== undefined ? parsed.data.tiempoMinutos : existing.tiempoMinutos;

  // For MANO_OBRA with mecanicoId and tiempoMinutos, recalculate
  if (existing.tipo === "MANO_OBRA" && mecanicoId && tiempoMinutos) {
    const tarifa = await calcularCostoHoraMecanico(mecanicoId);
    if (tarifa.tarifaHora) {
      precioUnitario = Math.round((tarifa.tarifaHora / 60) * tiempoMinutos);
    }
  }

  const subtotal = cantidad * precioUnitario;

  const item = await prisma.itemOT.update({
    where: { id: itemId },
    data: {
      descripcion: parsed.data.descripcion ?? existing.descripcion,
      cantidad,
      precioUnitario,
      subtotal,
      mecanicoId: mecanicoId ?? undefined,
      tiempoMinutos: tiempoMinutos ?? undefined,
      repuestoId: parsed.data.repuestoId !== undefined ? (parsed.data.repuestoId ?? undefined) : (existing.repuestoId ?? undefined),
      codigoOEM: parsed.data.codigoOEM !== undefined ? (parsed.data.codigoOEM ?? undefined) : (existing.codigoOEM ?? undefined),
    },
  });

  await recalcularCostosOT(id);

  return NextResponse.json({ data: item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id, itemId } = await params;

  // Verify OT is editable
  const ot = await prisma.ordenTrabajo.findUnique({ where: { id } });
  if (!ot) {
    return NextResponse.json({ error: "OT no encontrada" }, { status: 404 });
  }
  if (ot.estado === "COMPLETADA" || ot.estado === "CANCELADA") {
    return NextResponse.json(
      { error: "No se puede modificar una OT completada o cancelada" },
      { status: 400 }
    );
  }

  const existing = await prisma.itemOT.findUnique({ where: { id: itemId } });
  if (!existing || existing.ordenTrabajoId !== id) {
    return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
  }

  await prisma.itemOT.delete({ where: { id: itemId } });

  await recalcularCostosOT(id);

  return NextResponse.json({ ok: true });
}
