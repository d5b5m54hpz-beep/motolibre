import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const itemServiceSchema = z.object({
  nombre: z.string().min(1),
  categoria: z.enum([
    "MOTOR", "FRENOS", "SUSPENSION", "ELECTRICA", "CARROCERIA",
    "NEUMATICOS", "TRANSMISION", "LUBRICACION", "INSPECCION", "OTRO",
  ]),
  accion: z.enum(["CHECK", "REPLACE", "CHECK_AND_ADJUST", "ADJUST"]).default("CHECK"),
  descripcion: z.string().optional().nullable(),
  tiempoEstimado: z.number().int().positive().optional().nullable(),
});

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const data = await prisma.itemService.findMany({
    where: { activo: true },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ data });
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
  const parsed = itemServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.itemService.create({
    data: {
      nombre: parsed.data.nombre,
      categoria: parsed.data.categoria,
      accion: parsed.data.accion,
      descripcion: parsed.data.descripcion ?? undefined,
      tiempoEstimado: parsed.data.tiempoEstimado ?? undefined,
    },
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
