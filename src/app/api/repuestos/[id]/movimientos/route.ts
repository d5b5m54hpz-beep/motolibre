import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const limit = parseInt(sp.get("limit") || "50");

  const [data, total] = await Promise.all([
    prisma.movimientoStock.findMany({
      where: { repuestoId: id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.movimientoStock.count({ where: { repuestoId: id } }),
  ]);

  return NextResponse.json({ data, total, page, limit });
}
