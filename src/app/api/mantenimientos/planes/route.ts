import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { planMantenimientoSchema } from "@/lib/validations/orden-trabajo";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const planes = await prisma.planMantenimiento.findMany({
    include: {
      tareas: { orderBy: { orden: "asc" } },
      repuestos: true,
      _count: { select: { tareas: true, repuestos: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ data: planes });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = planMantenimientoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const plan = await prisma.planMantenimiento.create({
    data: {
      nombre: parsed.data.nombre,
      tipoService: parsed.data.tipoService,
      descripcion: parsed.data.descripcion ?? undefined,
      marcaMoto: parsed.data.marcaMoto ?? undefined,
      modeloMoto: parsed.data.modeloMoto ?? undefined,
      kmIntervalo: parsed.data.kmIntervalo ?? undefined,
      diasIntervalo: parsed.data.diasIntervalo ?? undefined,
      garantiaMeses: parsed.data.garantiaMeses ?? undefined,
      garantiaKm: parsed.data.garantiaKm ?? undefined,
      estado: parsed.data.estado ?? "BORRADOR",
      tareas: body.tareas?.length
        ? {
            create: body.tareas.map(
              (t: { categoria: string; descripcion: string; accion?: string; tiempoEstimado?: number | null; itemServiceId?: string | null }, i: number) => ({
                categoria: t.categoria,
                descripcion: t.descripcion,
                accion: t.accion ?? "CHECK",
                tiempoEstimado: t.tiempoEstimado ?? undefined,
                itemServiceId: t.itemServiceId ?? undefined,
                orden: i + 1,
              })
            ),
          }
        : undefined,
      repuestos: body.repuestos?.length
        ? {
            create: body.repuestos.map(
              (r: { nombre: string; cantidad: number; codigoOEM?: string; unidad?: string; capacidad?: string; precioUnitario?: number; repuestoId?: string }) => ({
                nombre: r.nombre,
                cantidad: r.cantidad,
                codigoOEM: r.codigoOEM ?? undefined,
                unidad: r.unidad ?? undefined,
                capacidad: r.capacidad ?? undefined,
                precioUnitario: r.precioUnitario ?? undefined,
                repuestoId: r.repuestoId ?? undefined,
              })
            ),
          }
        : undefined,
    },
    include: { tareas: true, repuestos: true },
  });

  return NextResponse.json({ data: plan }, { status: 201 });
}
