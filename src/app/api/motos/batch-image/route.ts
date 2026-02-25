import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const batchImageSchema = z.object({
  marca: z.string().min(1),
  modelo: z.string().min(1),
  imagenUrl: z.string().url(),
  excludeMotoId: z.string().optional(),
});

/**
 * GET: Count matching motos by marca+modelo (for the confirmation dialog).
 */
export async function GET(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.update,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const marca = searchParams.get("marca");
  const modelo = searchParams.get("modelo");
  const excludeId = searchParams.get("excludeId");

  if (!marca || !modelo) {
    return NextResponse.json(
      { error: "marca y modelo requeridos" },
      { status: 400 }
    );
  }

  const count = await prisma.moto.count({
    where: {
      marca,
      modelo,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  return NextResponse.json({ data: { count, marca, modelo } });
}

/**
 * POST: Batch update imagenUrl for all motos matching marca+modelo.
 */
export async function POST(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.bulkUpdate,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = batchImageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { marca, modelo, imagenUrl, excludeMotoId } = parsed.data;

  const result = await prisma.moto.updateMany({
    where: {
      marca,
      modelo,
      ...(excludeMotoId ? { id: { not: excludeMotoId } } : {}),
    },
    data: { imagenUrl },
  });

  return NextResponse.json({ data: { count: result.count } });
}
