import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.solicitud.evaluate,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const estado = sp.get("estado");
  const search = sp.get("search");

  const where: Record<string, unknown> = {};
  if (estado) where.estado = estado;
  if (search) {
    where.OR = [
      { cliente: { nombre: { contains: search, mode: "insensitive" } } },
      { cliente: { apellido: { contains: search, mode: "insensitive" } } },
      { cliente: { dni: { contains: search, mode: "insensitive" } } },
    ];
  }

  const data = await prisma.solicitud.findMany({
    where,
    orderBy: [{ prioridadEspera: "asc" }, { createdAt: "asc" }],
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          dni: true,
          email: true,
          telefono: true,
        },
      },
      moto: { select: { id: true, marca: true, modelo: true, patente: true } },
    },
  });

  return NextResponse.json({ data });
}
