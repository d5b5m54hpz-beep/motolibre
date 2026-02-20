import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();

  const { error } = await requirePermission(
    "system.permissions.view",
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  const profiles = await prisma.permissionProfile.findMany({
    include: {
      grants: {
        select: {
          operationId: true,
          canView: true,
          canCreate: true,
          canExecute: true,
          canApprove: true,
        },
      },
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ profiles, count: profiles.length });
}
