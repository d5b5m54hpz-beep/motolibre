import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lote = await prisma.loteCambioPrecio.findUnique({ where: { id } });
    if (!lote) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    return NextResponse.json(lote);
  } catch {
    return NextResponse.json({ error: "Error al obtener lote" }, { status: 500 });
  }
}
