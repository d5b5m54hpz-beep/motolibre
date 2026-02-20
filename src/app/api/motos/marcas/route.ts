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
    ["ADMIN", "OPERADOR", "COMERCIAL"]
  );
  if (error) return error;

  const marcas = await prisma.moto.findMany({
    distinct: ["marca"],
    select: { marca: true },
    orderBy: { marca: "asc" },
  });

  return NextResponse.json({ data: marcas.map((m) => m.marca) });
}
