import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: grupoId } = await params;
    const miembros = await prisma.miembroGrupoCliente.findMany({
      where: { grupoId },
      orderBy: { createdAt: "asc" },
    });
    const clienteIds = miembros.map((m) => m.clienteId);
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: clienteIds } },
      select: { id: true, nombre: true, apellido: true, email: true },
    });
    const cliMap = new Map(clientes.map((c) => [c.id, c]));
    return NextResponse.json(miembros.map((m) => ({ ...m, cliente: cliMap.get(m.clienteId) })));
  } catch {
    return NextResponse.json({ error: "Error al obtener miembros" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: grupoId } = await params;
    const { clienteId } = await req.json();
    const miembro = await prisma.miembroGrupoCliente.create({
      data: { grupoId, clienteId },
    });
    return NextResponse.json(miembro, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al agregar miembro" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: grupoId } = await params;
    const { clienteId } = await req.json();
    await prisma.miembroGrupoCliente.deleteMany({ where: { grupoId, clienteId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar miembro" }, { status: 500 });
  }
}
