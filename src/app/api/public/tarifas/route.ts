import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const marca = sp.get("marca");
  const modelo = sp.get("modelo");
  const condicion = sp.get("condicion");

  const now = new Date();

  const where: Record<string, unknown> = {
    activo: true,
    vigenciaDesde: { lte: now },
    OR: [
      { vigenciaHasta: null },
      { vigenciaHasta: { gte: now } },
    ],
  };
  if (marca) where.marca = marca;
  if (modelo) where.modelo = modelo;
  if (condicion) where.condicion = condicion;

  const tarifas = await prisma.tarifaAlquiler.findMany({
    where,
    select: {
      marca: true,
      modelo: true,
      condicion: true,
      plan: true,
      frecuencia: true,
      precio: true,
    },
    orderBy: [{ marca: "asc" }, { modelo: "asc" }, { plan: "asc" }, { frecuencia: "asc" }],
  });

  return NextResponse.json({ data: tarifas });
}
