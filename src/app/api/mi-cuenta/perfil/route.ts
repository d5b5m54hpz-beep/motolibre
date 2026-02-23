import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { perfilUpdateSchema } from "@/lib/validations/mi-cuenta";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const cliente = await prisma.cliente.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true, nombre: true, apellido: true, email: true, telefono: true,
      dni: true, calle: true, numero: true, piso: true, depto: true,
      localidad: true, provincia: true, codigoPostal: true, estado: true,
      createdAt: true,
    },
  });

  if (!cliente) {
    return NextResponse.json({ data: { cliente: null } });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, provider: true, createdAt: true },
  });

  return NextResponse.json({
    data: {
      cliente,
      cuenta: {
        email: user?.email,
        provider: user?.provider ?? "google",
        createdAt: user?.createdAt,
      },
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = perfilUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cliente = await prisma.cliente.findUnique({
    where: { userId: session.user.id },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 403 });
  }

  const data = parsed.data;

  const updated = await prisma.cliente.update({
    where: { id: cliente.id },
    data: {
      ...(data.email && { email: data.email.toLowerCase() }),
      ...(data.telefono && { telefono: data.telefono }),
      ...(data.calle !== undefined && { calle: data.calle }),
      ...(data.numero !== undefined && { numero: data.numero }),
      ...(data.piso !== undefined && { piso: data.piso }),
      ...(data.depto !== undefined && { depto: data.depto }),
      ...(data.localidad !== undefined && { localidad: data.localidad }),
      ...(data.provincia !== undefined && { provincia: data.provincia }),
      ...(data.codigoPostal !== undefined && { codigoPostal: data.codigoPostal }),
    },
    select: {
      id: true, nombre: true, apellido: true, email: true, telefono: true,
      dni: true, calle: true, numero: true, piso: true, depto: true,
      localidad: true, provincia: true, codigoPostal: true,
    },
  });

  // Sync email to User if changed
  if (data.email) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { email: data.email.toLowerCase() },
    });
  }

  return NextResponse.json({ data: { cliente: updated } });
}
