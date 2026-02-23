import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.user.create,
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      provider: true,
      phone: true,
      role: true,
      activo: true,
      totpEnabled: true,
      createdAt: true,
      updatedAt: true,
      profiles: {
        include: {
          profile: true,
        },
      },
      _count: { select: { sessions: true } },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: user });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.system.user.update,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;

  // No se puede modificar la propia cuenta
  if (userId === id) {
    return NextResponse.json(
      { error: "No puedes modificar tu propia cuenta desde este endpoint" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { role, activo, name, phone } = body;

  const updateData: Record<string, unknown> = {};

  if (role !== undefined) {
    const validRoles = [
      "ADMIN",
      "OPERADOR",
      "CLIENTE",
      "CONTADOR",
      "RRHH_MANAGER",
      "COMERCIAL",
      "VIEWER",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Rol invalido" },
        { status: 400 }
      );
    }
    updateData.role = role;
  }

  if (activo !== undefined) {
    if (typeof activo !== "boolean") {
      return NextResponse.json(
        { error: "El campo activo debe ser booleano" },
        { status: 400 }
      );
    }
    updateData.activo = activo;
  }

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre no puede estar vacio" },
        { status: 400 }
      );
    }
    updateData.name = name.trim();
  }

  if (phone !== undefined) {
    updateData.phone = phone;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      activo: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: user });
}
