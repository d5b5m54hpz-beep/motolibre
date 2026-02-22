import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const { precioUnitario } = await req.json();
    const item = await prisma.itemListaPrecio.update({
      where: { id: itemId },
      data: { precioUnitario },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Error al actualizar item" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    await prisma.itemListaPrecio.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar item" }, { status: 500 });
  }
}
