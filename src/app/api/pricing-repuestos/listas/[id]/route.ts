import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listaPrecioSchema } from "@/lib/validations/pricing-repuestos";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lista = await prisma.listaPrecio.findUnique({
      where: { id },
      include: {
        items: {
          include: { },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { items: true } },
      },
    });
    if (!lista) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });

    // Enrich items with repuesto data
    const repuestoIds = lista.items.map((i) => i.repuestoId);
    const repuestos = await prisma.repuesto.findMany({
      where: { id: { in: repuestoIds } },
      select: { id: true, codigo: true, nombre: true, categoria: true },
    });
    const repMap = new Map(repuestos.map((r) => [r.id, r]));
    const itemsEnriched = lista.items.map((i) => ({ ...i, repuesto: repMap.get(i.repuestoId) }));

    return NextResponse.json({ ...lista, items: itemsEnriched });
  } catch {
    return NextResponse.json({ error: "Error al obtener lista" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = listaPrecioSchema.partial().parse(body);
    const lista = await prisma.listaPrecio.update({
      where: { id },
      data: {
        ...data,
        vigenciaDesde: data.vigenciaDesde ? new Date(data.vigenciaDesde) : undefined,
        vigenciaHasta: data.vigenciaHasta ? new Date(data.vigenciaHasta) : null,
      },
    });
    return NextResponse.json(lista);
  } catch {
    return NextResponse.json({ error: "Error al actualizar lista" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.listaPrecio.update({ where: { id }, data: { activa: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar lista" }, { status: 500 });
  }
}
