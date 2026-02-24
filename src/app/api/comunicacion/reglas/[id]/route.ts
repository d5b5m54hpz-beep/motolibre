import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().nullable().optional(),
  tipoContacto: z
    .enum([
      "PROVEEDOR",
      "CONTADOR",
      "ABOGADO",
      "DESPACHANTE",
      "ASEGURADORA",
      "TALLER_EXTERNO",
      "CLIENTE_POTENCIAL",
      "OTRO",
    ])
    .nullable()
    .optional(),
  palabrasClave: z.array(z.string()).optional(),
  prioridadMaxima: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  accion: z.enum(["ENVIAR_DIRECTO", "BORRADOR_SOLO", "NOTIFICAR"]).optional(),
  plantillaId: z.string().nullable().optional(),
  activa: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.autonomy.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const regla = await prisma.reglaAutonomia.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ data: regla });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.autonomy.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  await prisma.reglaAutonomia.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
