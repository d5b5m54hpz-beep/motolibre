import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { precioBase, motivo } = body;

    const existing = await prisma.precioModeloAlquiler.findUnique({ where: { id }, include: { plan: true } });
    if (!existing) return NextResponse.json({ error: "Precio no encontrado" }, { status: 404 });

    const descuento = Number(existing.plan.descuentoPorcentaje ?? 0);
    const precioFinal = Math.round(Number(precioBase) * (1 - descuento / 100) * 100) / 100;

    await prisma.historialPrecioAlquiler.create({
      data: {
        precioModeloId: id,
        planId: existing.planId,
        modeloMoto: existing.modeloMoto,
        precioAnterior: existing.precioFinal,
        precioNuevo: precioFinal,
        motivo: motivo ?? "Actualización de precio",
      },
    });

    const updated = await prisma.precioModeloAlquiler.update({
      where: { id },
      data: { precioBase, precioFinal },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error al actualizar precio" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.precioModeloAlquiler.update({ where: { id }, data: { activo: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar precio" }, { status: 500 });
  }
}
