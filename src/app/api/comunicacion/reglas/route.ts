import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
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
    .optional(),
  palabrasClave: z.array(z.string()).optional(),
  prioridadMaxima: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  accion: z.enum(["ENVIAR_DIRECTO", "BORRADOR_SOLO", "NOTIFICAR"]),
  plantillaId: z.string().optional(),
});

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.autonomy.create,
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  const data = await prisma.reglaAutonomia.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.communication.autonomy.create,
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

  const regla = await prisma.reglaAutonomia.create({
    data: {
      ...parsed.data,
      palabrasClave: parsed.data.palabrasClave || [],
      prioridadMaxima: parsed.data.prioridadMaxima || "BAJA",
    },
  });

  return NextResponse.json({ data: regla }, { status: 201 });
}
