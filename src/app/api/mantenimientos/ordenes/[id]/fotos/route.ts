import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const fotos = await prisma.fotoInspeccion.findMany({
    where: { ordenTrabajoId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: fotos });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.update,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  if (!body.url || !body.tipo) {
    return NextResponse.json(
      { error: "URL y tipo de foto son requeridos" },
      { status: 400 }
    );
  }

  const foto = await prisma.fotoInspeccion.create({
    data: {
      ordenTrabajoId: id,
      url: body.url,
      tipo: body.tipo,
      descripcion: body.descripcion ?? undefined,
    },
  });

  return NextResponse.json({ data: foto }, { status: 201 });
}
