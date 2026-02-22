import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grupoClienteSchema } from "@/lib/validations/pricing-repuestos";

export async function GET() {
  try {
    const grupos = await prisma.grupoCliente.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { miembros: true } } },
    });
    return NextResponse.json(grupos);
  } catch {
    return NextResponse.json({ error: "Error al obtener grupos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = grupoClienteSchema.parse(body);
    const grupo = await prisma.grupoCliente.create({ data });
    return NextResponse.json(grupo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear grupo" }, { status: 500 });
  }
}
