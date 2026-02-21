import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.accounting.period.close,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const periodos = await prisma.periodoContable.findMany({
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
    include: {
      _count: { select: { asientos: true } },
    },
  });

  return NextResponse.json({ data: periodos });
}
