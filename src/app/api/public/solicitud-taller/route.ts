import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { solicitudCreateSchema } from "@/lib/validations/solicitud-taller";
import { apiSetup } from "@/lib/api-helpers";

/**
 * POST /api/public/solicitud-taller
 * Crear una nueva solicitud de taller como BORRADOR (sin auth).
 * Retorna el token público para seguimiento.
 */
export async function POST(req: NextRequest) {
  apiSetup();

  const body = await req.json();
  const parsed = solicitudCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const solicitud = await prisma.solicitudTaller.create({
    data: {
      ...parsed.data,
      estado: "BORRADOR",
    },
    select: {
      id: true,
      tokenPublico: true,
      estado: true,
      nombreTaller: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: solicitud }, { status: 201 });
}
