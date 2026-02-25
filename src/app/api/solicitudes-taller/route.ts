import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.network.application.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const url = req.nextUrl.searchParams;
  const estado = url.get("estado");
  const provincia = url.get("provincia");
  const search = url.get("search");

  const where: Record<string, unknown> = {};
  if (estado) where.estado = estado;
  if (provincia) where.provincia = provincia;
  if (search) {
    where.OR = [
      { nombreTaller: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { contactoNombre: { contains: search, mode: "insensitive" } },
      { ciudad: { contains: search, mode: "insensitive" } },
      { cuit: { contains: search, mode: "insensitive" } },
    ];
  }

  const solicitudes = await prisma.solicitudTaller.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { evaluaciones: true } },
    },
  });

  return NextResponse.json({ data: solicitudes });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error, userId } = await requirePermission(
    OPERATIONS.network.application.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();

  const solicitud = await withEvent(
    OPERATIONS.network.application.create,
    "SolicitudTaller",
    () =>
      prisma.solicitudTaller.create({
        data: {
          ...body,
          estado: "RECIBIDA",
          fechaRecepcion: new Date(),
          creadoPor: userId,
        },
      }),
    userId
  );

  return NextResponse.json({ data: solicitud }, { status: 201 });
}
