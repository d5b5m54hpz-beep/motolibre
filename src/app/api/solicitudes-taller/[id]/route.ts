import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { solicitudUpdateSchema } from "@/lib/validations/solicitud-taller";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.network.application.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const solicitud = await prisma.solicitudTaller.findUnique({
    where: { id },
    include: {
      evaluaciones: { orderBy: { categoria: "asc" } },
      convenio: true,
      taller: true,
    },
  });

  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: solicitud });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.network.application.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const solicitud = await prisma.solicitudTaller.findUnique({ where: { id } });
  if (!solicitud) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const parsed = solicitudUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await withEvent(
    OPERATIONS.network.application.update,
    "SolicitudTaller",
    () =>
      prisma.solicitudTaller.update({
        where: { id },
        data: parsed.data,
      }),
    userId
  );

  return NextResponse.json({ data: updated });
}
