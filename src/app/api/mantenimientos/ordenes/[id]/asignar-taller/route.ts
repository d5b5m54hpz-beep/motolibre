import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const asignarSchema = z.object({
  tallerId: z.string().min(1, "Taller requerido"),
  horasLimite: z.number().int().positive().default(24), // SLA hours
});

/**
 * POST /api/mantenimientos/ordenes/[id]/asignar-taller
 * Create an assignment for a taller to accept/reject the OT.
 */
export async function POST(
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

  if (!["APROBADA", "PROGRAMADA"].includes(ot.estado)) {
    return NextResponse.json(
      { error: "Solo se puede asignar OTs en estado APROBADA o PROGRAMADA" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = asignarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tallerId, horasLimite } = parsed.data;

  // Verify taller exists and is active
  const taller = await prisma.taller.findUnique({
    where: { id: tallerId },
    select: { id: true, nombre: true, activo: true, tipo: true },
  });

  if (!taller || !taller.activo) {
    return NextResponse.json(
      { error: "Taller no encontrado o inactivo" },
      { status: 400 }
    );
  }

  // Check for existing pending assignment for this OT + taller
  const existing = await prisma.asignacionOT.findFirst({
    where: {
      ordenTrabajoId: id,
      tallerId,
      estado: "PENDIENTE",
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una asignación pendiente para este taller" },
      { status: 400 }
    );
  }

  const fechaLimite = new Date();
  fechaLimite.setHours(fechaLimite.getHours() + horasLimite);

  const asignacion = await prisma.asignacionOT.create({
    data: {
      ordenTrabajoId: id,
      tallerId,
      fechaLimite,
      asignadoPor: userId,
    },
  });

  return NextResponse.json({ data: asignacion }, { status: 201 });
}

/**
 * GET /api/mantenimientos/ordenes/[id]/asignar-taller
 * List assignments for this OT.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const asignaciones = await prisma.asignacionOT.findMany({
    where: { ordenTrabajoId: id },
    include: {
      taller: { select: { id: true, nombre: true, codigoRed: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: asignaciones });
}
