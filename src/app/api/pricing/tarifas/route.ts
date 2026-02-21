import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { tarifaCreateSchema } from "@/lib/validations/tarifa";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.pricing.rental.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const marca = sp.get("marca");
  const modelo = sp.get("modelo");
  const condicion = sp.get("condicion");
  const soloActivas = sp.get("activo") !== "false";

  const where: Record<string, unknown> = {};
  if (soloActivas) where.activo = true;
  if (marca) where.marca = marca;
  if (modelo) where.modelo = modelo;
  if (condicion) where.condicion = condicion;

  const tarifas = await prisma.tarifaAlquiler.findMany({
    where,
    orderBy: [
      { marca: "asc" },
      { modelo: "asc" },
      { condicion: "asc" },
      { plan: "asc" },
      { frecuencia: "asc" },
    ],
  });

  return NextResponse.json({ data: tarifas });
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.pricing.rental.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = tarifaCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tarifa = await withEvent(
    OPERATIONS.pricing.rental.create,
    "TarifaAlquiler",
    () =>
      prisma.tarifaAlquiler.create({
        data: {
          ...parsed.data,
          precio: parsed.data.precio,
          vigenciaDesde: parsed.data.vigenciaDesde ? new Date(parsed.data.vigenciaDesde) : new Date(),
          vigenciaHasta: parsed.data.vigenciaHasta ? new Date(parsed.data.vigenciaHasta) : undefined,
          creadoPor: userId,
        },
      }),
    userId
  );

  return NextResponse.json({ data: tarifa }, { status: 201 });
}
