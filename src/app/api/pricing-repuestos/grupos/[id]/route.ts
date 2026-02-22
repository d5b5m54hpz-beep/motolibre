import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grupoClienteSchema } from "@/lib/validations/pricing-repuestos";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const grupo = await prisma.grupoCliente.findUnique({
      where: { id },
      include: {
        miembros: {
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { miembros: true } },
      },
    });
    if (!grupo) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });

    // Enrich with cliente data
    const clienteIds = grupo.miembros.map((m) => m.clienteId);
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: clienteIds } },
      select: { id: true, nombre: true, apellido: true, email: true },
    });
    const cliMap = new Map(clientes.map((c) => [c.id, c]));
    const miembrosEnriched = grupo.miembros.map((m) => ({
      ...m,
      cliente: cliMap.get(m.clienteId),
    }));

    return NextResponse.json({ ...grupo, miembros: miembrosEnriched });
  } catch {
    return NextResponse.json({ error: "Error al obtener grupo" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = grupoClienteSchema.partial().parse(body);
    const grupo = await prisma.grupoCliente.update({ where: { id }, data });
    return NextResponse.json(grupo);
  } catch {
    return NextResponse.json({ error: "Error al actualizar grupo" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.grupoCliente.update({ where: { id }, data: { activo: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar grupo" }, { status: 500 });
  }
}
