import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loteCambioSchema } from "@/lib/validations/pricing-repuestos";

export async function GET() {
  try {
    const lotes = await prisma.loteCambioPrecio.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(lotes);
  } catch {
    return NextResponse.json({ error: "Error al obtener lotes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = loteCambioSchema.parse(body);
    const lote = await prisma.loteCambioPrecio.create({
      data: {
        nombre: data.nombre,
        tipo: data.tipo,
        valor: data.valor,
        categorias: data.categorias,
        proveedorId: data.proveedorId ?? null,
        estado: "PENDIENTE",
      },
    });
    return NextResponse.json(lote, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear lote" }, { status: 500 });
  }
}
