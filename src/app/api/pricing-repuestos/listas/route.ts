import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listaPrecioSchema } from "@/lib/validations/pricing-repuestos";

export async function GET() {
  try {
    const listas = await prisma.listaPrecio.findMany({
      orderBy: [{ prioridad: "desc" }, { nombre: "asc" }],
      include: { _count: { select: { items: true } } },
    });
    return NextResponse.json(listas);
  } catch {
    return NextResponse.json({ error: "Error al obtener listas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = listaPrecioSchema.parse(body);
    const lista = await prisma.listaPrecio.create({
      data: {
        ...data,
        vigenciaDesde: data.vigenciaDesde ? new Date(data.vigenciaDesde) : new Date(),
        vigenciaHasta: data.vigenciaHasta ? new Date(data.vigenciaHasta) : null,
      },
    });
    return NextResponse.json(lista, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear lista" }, { status: 500 });
  }
}
