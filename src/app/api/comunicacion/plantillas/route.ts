import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  nombre: z.string().min(1),
  asunto: z.string().min(1),
  cuerpo: z.string().min(1),
  tipo: z.string().optional(),
});

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.template.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const data = await prisma.plantillaMensaje.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.template.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const plantilla = await prisma.plantillaMensaje.create({
    data: parsed.data,
  });

  return NextResponse.json({ data: plantilla }, { status: 201 });
}
