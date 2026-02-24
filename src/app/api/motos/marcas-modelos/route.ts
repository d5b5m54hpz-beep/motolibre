import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const motos = await prisma.moto.findMany({
    where: { estado: { not: "BAJA_DEFINITIVA" } },
    select: { marca: true, modelo: true },
    distinct: ["marca", "modelo"],
    orderBy: [{ marca: "asc" }, { modelo: "asc" }],
  });

  // Group by marca
  const grouped: Record<string, string[]> = {};
  for (const m of motos) {
    if (!grouped[m.marca]) grouped[m.marca] = [];
    if (!grouped[m.marca]!.includes(m.modelo)) {
      grouped[m.marca]!.push(m.modelo);
    }
  }

  const data = Object.entries(grouped)
    .map(([marca, modelos]) => ({ marca, modelos: modelos.sort() }))
    .sort((a, b) => a.marca.localeCompare(b.marca));

  return NextResponse.json({ data });
}
