import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  asunto: z.string().min(1).optional(),
  cuerpo: z.string().min(1).optional(),
  tipo: z.string().nullable().optional(),
  activa: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.template.update,
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

  const plantilla = await prisma.plantillaMensaje.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ data: plantilla });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.template.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  await prisma.plantillaMensaje.update({
    where: { id },
    data: { activa: false },
  });

  return NextResponse.json({ ok: true });
}
