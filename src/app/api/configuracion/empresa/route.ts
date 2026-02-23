import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.config.update,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  let config = await prisma.configuracionEmpresa.findFirst();
  if (!config) {
    config = await prisma.configuracionEmpresa.create({ data: {} });
  }

  return NextResponse.json({ data: config });
}

export async function PUT(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.config.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  let config = await prisma.configuracionEmpresa.findFirst();
  if (!config) {
    config = await prisma.configuracionEmpresa.create({ data: {} });
  }

  const body = await req.json();

  // Eliminar campos que no deben ser modificados directamente
  delete body.id;
  delete body.createdAt;
  delete body.updatedAt;

  const updated = await prisma.configuracionEmpresa.update({
    where: { id: config.id },
    data: body,
  });

  return NextResponse.json({ data: updated });
}
