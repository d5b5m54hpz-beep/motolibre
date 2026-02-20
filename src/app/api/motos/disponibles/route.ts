import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.commercial.contract.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL"]
  );
  if (error) return error;

  const motos = await prisma.moto.findMany({
    where: { estado: "DISPONIBLE" },
    select: {
      id: true,
      marca: true,
      modelo: true,
      patente: true,
      precioAlquilerMensual: true,
      cilindrada: true,
    },
    orderBy: { marca: "asc" },
  });

  return NextResponse.json({ data: motos });
}
