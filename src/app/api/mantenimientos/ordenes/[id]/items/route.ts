import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { itemOTCreateSchema } from "@/lib/validations/orden-trabajo";
import { calcularCostoHoraMecanico } from "@/lib/services/costo-mecanico";
import { apiSetup } from "@/lib/api-helpers";
import { recalcularCostosOT } from "@/lib/services/recalcular-costos-ot";

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
  const items = await prisma.itemOT.findMany({
    where: { ordenTrabajoId: id },
    orderBy: [{ tipo: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ data: items });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  // Verify OT exists and is editable
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

  const body = await req.json();
  const parsed = itemOTCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let { precioUnitario } = parsed.data;
  const { tipo, descripcion, cantidad, mecanicoId, tiempoMinutos, repuestoId, codigoOEM } = parsed.data;

  // For MANO_OBRA with mecanicoId and tiempoMinutos, auto-calculate precioUnitario
  if (tipo === "MANO_OBRA" && mecanicoId && tiempoMinutos) {
    const tarifa = await calcularCostoHoraMecanico(mecanicoId);
    if (tarifa.tarifaHora) {
      // precioUnitario = cost per minute * tiempoMinutos
      precioUnitario = Math.round((tarifa.tarifaHora / 60) * tiempoMinutos);
    }
  }

  const subtotal = cantidad * precioUnitario;

  const item = await prisma.itemOT.create({
    data: {
      ordenTrabajoId: id,
      tipo,
      descripcion,
      cantidad,
      precioUnitario,
      subtotal,
      mecanicoId: mecanicoId ?? undefined,
      tiempoMinutos: tiempoMinutos ?? undefined,
      repuestoId: repuestoId ?? undefined,
      codigoOEM: codigoOEM ?? undefined,
    },
  });

  await recalcularCostosOT(id);

  return NextResponse.json({ data: item }, { status: 201 });
}
