import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

// ── Types ──
interface BuilderTarea {
  itemServiceId?: string;
  categoria: string;
  descripcion: string;
  accion: string;
  tiempoEstimado?: number;
  orden: number;
}

interface BuilderRepuesto {
  repuestoId?: string;
  nombre: string;
  codigoOEM?: string;
  cantidad: number;
  unidad?: string;
  precioUnitario?: number;
}

interface BuilderMilestone {
  km: number;
  nombre: string;
  diasIntervalo?: number;
  tareas: BuilderTarea[];
  repuestos: BuilderRepuesto[];
}

interface BuilderPayload {
  marca: string;
  modelo: string;
  estado: "BORRADOR" | "PUBLICADO";
  milestones: BuilderMilestone[];
}

// ── Helpers ──
function deriveTipoService(km: number): string {
  switch (km) {
    case 5000:
      return "SERVICE_5000KM";
    case 10000:
      return "SERVICE_10000KM";
    case 15000:
      return "SERVICE_15000KM";
    case 20000:
      return "SERVICE_20000KM";
    default:
      return "SERVICE_GENERAL";
  }
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body: BuilderPayload = await req.json();

  if (!body.marca || !body.modelo || !body.milestones?.length) {
    return NextResponse.json(
      { error: "marca, modelo y al menos un milestone son requeridos" },
      { status: 400 }
    );
  }

  const results: Array<Record<string, unknown>> = [];

  for (const milestone of body.milestones) {
    const tipoService = deriveTipoService(milestone.km);
    const planName = `Service ${milestone.km}km ${body.marca} ${body.modelo} - ${milestone.nombre}`;

    // Check if a plan already exists with same marca + modelo + kmIntervalo
    const existing = await prisma.planMantenimiento.findFirst({
      where: {
        marcaMoto: body.marca,
        modeloMoto: body.modelo,
        kmIntervalo: milestone.km,
      },
    });

    let plan;

    if (existing) {
      // Delete old tareas and repuestos
      await prisma.tareaPlan.deleteMany({ where: { planId: existing.id } });
      await prisma.repuestoTareaPlan.deleteMany({
        where: { planId: existing.id },
      });

      // Update the plan
      plan = await prisma.planMantenimiento.update({
        where: { id: existing.id },
        data: {
          nombre: planName,
          tipoService: tipoService as never,
          estado: (body.estado ?? "BORRADOR") as never,
          marcaMoto: body.marca,
          modeloMoto: body.modelo,
          kmIntervalo: milestone.km,
          diasIntervalo: milestone.diasIntervalo ?? undefined,
          tareas: {
            create: milestone.tareas.map((t) => ({
              orden: t.orden,
              categoria: t.categoria as never,
              descripcion: t.descripcion,
              accion: (t.accion ?? "CHECK") as never,
              tiempoEstimado: t.tiempoEstimado ?? undefined,
              itemServiceId: t.itemServiceId ?? undefined,
            })),
          },
          repuestos: {
            create: milestone.repuestos.map((r) => ({
              nombre: r.nombre,
              codigoOEM: r.codigoOEM ?? undefined,
              cantidad: r.cantidad,
              unidad: r.unidad ?? undefined,
              precioUnitario: r.precioUnitario ?? undefined,
              repuestoId: r.repuestoId ?? undefined,
            })),
          },
        },
        include: { tareas: true, repuestos: true },
      });
    } else {
      // Create new plan
      plan = await prisma.planMantenimiento.create({
        data: {
          nombre: planName,
          tipoService: tipoService as never,
          estado: (body.estado ?? "BORRADOR") as never,
          marcaMoto: body.marca,
          modeloMoto: body.modelo,
          kmIntervalo: milestone.km,
          diasIntervalo: milestone.diasIntervalo ?? undefined,
          tareas: {
            create: milestone.tareas.map((t) => ({
              orden: t.orden,
              categoria: t.categoria as never,
              descripcion: t.descripcion,
              accion: (t.accion ?? "CHECK") as never,
              tiempoEstimado: t.tiempoEstimado ?? undefined,
              itemServiceId: t.itemServiceId ?? undefined,
            })),
          },
          repuestos: {
            create: milestone.repuestos.map((r) => ({
              nombre: r.nombre,
              codigoOEM: r.codigoOEM ?? undefined,
              cantidad: r.cantidad,
              unidad: r.unidad ?? undefined,
              precioUnitario: r.precioUnitario ?? undefined,
              repuestoId: r.repuestoId ?? undefined,
            })),
          },
        },
        include: { tareas: true, repuestos: true },
      });
    }

    results.push(plan as unknown as Record<string, unknown>);
  }

  return NextResponse.json({ data: results }, { status: 201 });
}
