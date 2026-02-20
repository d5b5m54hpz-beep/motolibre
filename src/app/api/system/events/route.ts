import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();

  const { error } = await requirePermission("system.events.view", "canView", [
    "ADMIN",
  ]);
  if (error) return error;

  const events = await prisma.businessEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      operationId: true,
      entityType: true,
      entityId: true,
      status: true,
      error: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ events, count: events.length });
}
