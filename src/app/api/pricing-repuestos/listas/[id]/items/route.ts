import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { itemsListaBulkSchema } from "@/lib/validations/pricing-repuestos";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const items = await prisma.itemListaPrecio.findMany({
      where: { listaId: id },
      orderBy: { createdAt: "asc" },
    });
    const repuestoIds = items.map((i) => i.repuestoId);
    const repuestos = await prisma.repuesto.findMany({
      where: { id: { in: repuestoIds } },
      select: { id: true, codigo: true, nombre: true, categoria: true },
    });
    const repMap = new Map(repuestos.map((r) => [r.id, r]));
    return NextResponse.json(items.map((i) => ({ ...i, repuesto: repMap.get(i.repuestoId) })));
  } catch {
    return NextResponse.json({ error: "Error al obtener items" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listaId } = await params;
    const body = await req.json();
    // Acepta array (bulk) o objeto individual
    const rawItems = Array.isArray(body) ? body : [body];
    const items = itemsListaBulkSchema.parse(rawItems);

    const created = await Promise.all(
      items.map((item) =>
        prisma.itemListaPrecio.upsert({
          where: { listaId_repuestoId: { listaId, repuestoId: item.repuestoId } },
          update: { precioUnitario: item.precioUnitario },
          create: { listaId, repuestoId: item.repuestoId, precioUnitario: item.precioUnitario },
        })
      )
    );
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al agregar items" }, { status: 500 });
  }
}
