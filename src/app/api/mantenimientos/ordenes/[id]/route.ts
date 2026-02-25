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
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id },
    include: {
      tareas: { orderBy: { orden: "asc" } },
      repuestos: { orderBy: { createdAt: "asc" } },
      items: { orderBy: [{ tipo: "asc" }, { createdAt: "asc" }] },
      fotos: { orderBy: { createdAt: "asc" } },
      historial: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!ot) {
    return NextResponse.json({ error: "OT no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: ot });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const ot = await prisma.ordenTrabajo.findUnique({ where: { id } });
  if (!ot) {
    return NextResponse.json({ error: "OT no encontrada" }, { status: 404 });
  }

  if (ot.estado === "COMPLETADA" || ot.estado === "CANCELADA") {
    return NextResponse.json(
      { error: "No se puede editar una OT completada o cancelada" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const updated = await withEvent(
    OPERATIONS.maintenance.workOrder.update,
    "OrdenTrabajo",
    () =>
      prisma.ordenTrabajo.update({
        where: { id },
        data: {
          descripcion: body.descripcion ?? ot.descripcion,
          diagnostico: body.diagnostico ?? ot.diagnostico,
          observaciones: body.observaciones ?? ot.observaciones,
          fechaProgramada: body.fechaProgramada ? new Date(body.fechaProgramada) : ot.fechaProgramada,
          tallerNombre: body.tallerNombre ?? ot.tallerNombre,
          mecanicoNombre: body.mecanicoNombre ?? ot.mecanicoNombre,
          prioridad: body.prioridad ?? ot.prioridad,
          tipoService: body.tipoService ?? ot.tipoService,
          costoManoObra: body.costoManoObra !== undefined ? body.costoManoObra : ot.costoManoObra,
        },
      }),
    userId
  );

  return NextResponse.json({ data: updated });
}
