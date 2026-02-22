import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const modeloMoto = searchParams.get("modeloMoto");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    const historial = await prisma.historialPrecioAlquiler.findMany({
      where: {
        ...(modeloMoto && { modeloMoto }),
        ...(desde || hasta
          ? {
              createdAt: {
                ...(desde && { gte: new Date(desde) }),
                ...(hasta && { lte: new Date(hasta) }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(historial);
  } catch {
    return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 });
  }
}
