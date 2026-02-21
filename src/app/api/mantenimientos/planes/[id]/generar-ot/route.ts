import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { proximoNumeroOT } from "@/lib/ot-utils";
import { apiSetup } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  if (!body.motoId) {
    return NextResponse.json({ error: "motoId requerido" }, { status: 400 });
  }

  const plan = await prisma.planMantenimiento.findUnique({
    where: { id },
    include: { tareas: { orderBy: { orden: "asc" } }, repuestos: true },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  const numero = await proximoNumeroOT();

  const ot = await withEvent(
    OPERATIONS.maintenance.workOrder.create,
    "OrdenTrabajo",
    () =>
      prisma.ordenTrabajo.create({
        data: {
          numero,
          tipo: "PREVENTIVO",
          tipoService: plan.tipoService,
          motoId: body.motoId,
          contratoId: body.contratoId ?? undefined,
          clienteId: body.clienteId ?? undefined,
          descripcion: `${plan.nombre}${plan.descripcion ? ` — ${plan.descripcion}` : ""}`,
          solicitadoPor: userId,
          tareas: {
            create: plan.tareas.map((t) => ({
              categoria: t.categoria,
              descripcion: t.descripcion,
              orden: t.orden,
            })),
          },
          repuestos: plan.repuestos.length > 0
            ? {
                create: plan.repuestos.map((r) => ({
                  nombre: r.nombre,
                  cantidad: r.cantidad,
                  precioUnitario: 0,
                  subtotal: 0,
                })),
              }
            : undefined,
          historial: {
            create: {
              estadoAnterior: "SOLICITADA",
              estadoNuevo: "SOLICITADA",
              descripcion: `OT generada desde plan: ${plan.nombre}`,
              userId,
            },
          },
        },
        include: { tareas: true, repuestos: true },
      }),
    userId
  );

  return NextResponse.json({ data: ot }, { status: 201 });
}
