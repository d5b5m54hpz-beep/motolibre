import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 1) {
    return NextResponse.json({ data: [] });
  }

  const data = await prisma.repuesto.findMany({
    where: {
      activo: true,
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { codigo: { contains: q, mode: "insensitive" } },
        { marca: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      precioCompra: true,
      stock: true,
      unidad: true,
      categoria: true,
    },
    orderBy: { nombre: "asc" },
    take: 10,
  });

  return NextResponse.json({ data });
}
