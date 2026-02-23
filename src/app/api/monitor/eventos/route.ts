import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.monitor.view,
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "50")));
    const nivel = sp.get("nivel");
    const modulo = sp.get("modulo");
    const tipo = sp.get("tipo");
    const desde = sp.get("desde");
    const hasta = sp.get("hasta");

    const where: Record<string, unknown> = {};

    if (nivel) {
      where.nivel = nivel;
    }

    if (modulo) {
      where.origenModulo = modulo;
    }

    if (tipo) {
      where.tipo = { contains: tipo, mode: "insensitive" };
    }

    if (desde || hasta) {
      const createdAt: Record<string, Date> = {};
      if (desde) createdAt.gte = new Date(desde);
      if (hasta) createdAt.lte = new Date(hasta);
      where.createdAt = createdAt;
    }

    const [data, total] = await Promise.all([
      prisma.eventoSistema.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.eventoSistema.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Error fetching eventos:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos del sistema" },
      { status: 500 }
    );
  }
}
