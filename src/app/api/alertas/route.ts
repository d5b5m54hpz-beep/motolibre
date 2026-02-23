import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { auth } from "@/lib/auth";
import type { TipoAlerta } from "@prisma/client";

export async function GET(req: NextRequest) {
  apiSetup();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
    const limit = Math.max(1, Math.min(100, parseInt(sp.get("limit") ?? "20")));
    const leidaParam = sp.get("leida");
    const tipoParam = sp.get("tipo");
    const moduloParam = sp.get("modulo");

    const where: Record<string, unknown> = {
      usuarioId: session.user.id,
    };

    if (leidaParam !== null) {
      where.leida = leidaParam === "true";
    }

    if (tipoParam) {
      where.tipo = tipoParam as TipoAlerta;
    }

    if (moduloParam) {
      where.modulo = moduloParam;
    }

    const [data, total, noLeidas] = await Promise.all([
      prisma.alerta.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.alerta.count({ where }),
      prisma.alerta.count({
        where: { usuarioId: session.user.id, leida: false },
      }),
    ]);

    return NextResponse.json({
      data,
      total,
      noLeidas,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Error al obtener alertas:", error);
    return NextResponse.json(
      { error: "Error al obtener alertas" },
      { status: 500 }
    );
  }
}
