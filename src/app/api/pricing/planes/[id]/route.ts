import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { planAlquilerSchema } from "@/lib/validations/pricing";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const plan = await prisma.planAlquiler.findUnique({
      where: { id },
      include: { precios: { where: { activo: true }, orderBy: { modeloMoto: "asc" } } },
    });
    if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "Error al obtener plan" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = planAlquilerSchema.partial().parse(body);
    const plan = await prisma.planAlquiler.update({ where: { id }, data });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "Error al actualizar plan" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.planAlquiler.update({ where: { id }, data: { activo: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar plan" }, { status: 500 });
  }
}
