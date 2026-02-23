import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.anomaly.detect,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") || "1");
  const limit = Number(sp.get("limit") || "50");
  const tipo = sp.get("tipo");
  const severidad = sp.get("severidad");
  const estado = sp.get("estado");
  const entidadTipo = sp.get("entidadTipo");
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  const search = sp.get("search");

  const where: Prisma.AnomaliaWhereInput = {};
  if (tipo) where.tipo = tipo as Prisma.EnumTipoAnomaliaFilter;
  if (severidad) where.severidad = severidad as Prisma.EnumSeveridadAnomaliaFilter;
  if (estado) where.estado = estado as Prisma.EnumEstadoAnomaliaFilter;
  if (entidadTipo) where.entidadTipo = entidadTipo;
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = new Date(desde);
    if (hasta) where.createdAt.lte = new Date(hasta);
  }
  if (search) {
    where.OR = [
      { titulo: { contains: search, mode: "insensitive" } },
      { descripcion: { contains: search, mode: "insensitive" } },
      { entidadLabel: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [anomalias, total] = await Promise.all([
    prisma.anomalia.findMany({
      where,
      orderBy: [
        { severidad: "desc" },
        { createdAt: "desc" },
      ],
      skip,
      take: limit,
    }),
    prisma.anomalia.count({ where }),
  ]);

  return NextResponse.json({ data: anomalias, total, page, limit });
}
