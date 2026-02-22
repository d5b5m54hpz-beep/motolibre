import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { planAlquilerSchema } from "@/lib/validations/pricing";

export async function GET() {
  try {
    const planes = await prisma.planAlquiler.findMany({
      orderBy: { orden: "asc" },
      include: {
        _count: { select: { precios: { where: { activo: true } } } },
        precios: {
          where: { activo: true },
          orderBy: { modeloMoto: "asc" },
        },
      },
    });
    return NextResponse.json(planes);
  } catch {
    return NextResponse.json({ error: "Error al obtener planes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = planAlquilerSchema.parse(body);
    const plan = await prisma.planAlquiler.create({ data });
    return NextResponse.json(plan, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: e }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear plan" }, { status: 500 });
  }
}
