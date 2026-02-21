import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import type { EstadoMantenimiento, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workshop.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const estado = sp.get("estado");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");

  const where: Prisma.MantenimientoProgramadoWhereInput = {};
  if (estado) where.estado = estado as EstadoMantenimiento;
  if (desde || hasta) {
    where.fechaProgramada = {};
    if (desde) (where.fechaProgramada as Prisma.DateTimeFilter).gte = new Date(desde);
    if (hasta) (where.fechaProgramada as Prisma.DateTimeFilter).lte = new Date(hasta);
  }

  const data = await prisma.mantenimientoProgramado.findMany({
    where,
    orderBy: { fechaProgramada: "asc" },
    include: {
      cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } },
      moto: { select: { id: true, marca: true, modelo: true, patente: true } },
      contrato: { select: { id: true } },
    },
  });

  return NextResponse.json({ data });
}
