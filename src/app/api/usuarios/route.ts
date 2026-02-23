import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.user.create,
    "canView",
    ["ADMIN"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") ?? "1");
  const limit = parseInt(sp.get("limit") ?? "50");
  const rol = sp.get("rol");
  const activo = sp.get("activo");
  const busqueda = sp.get("busqueda");

  const where: Record<string, unknown> = {};

  if (rol) {
    where.role = rol;
  }

  if (activo !== null && activo !== undefined && activo !== "") {
    where.activo = activo === "true";
  }

  if (busqueda) {
    where.OR = [
      { name: { contains: busqueda, mode: "insensitive" } },
      { email: { contains: busqueda, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        activo: true,
        phone: true,
        createdAt: true,
        _count: { select: { sessions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

const VALID_ROLES = [
  "ADMIN",
  "OPERADOR",
  "CLIENTE",
  "CONTADOR",
  "RRHH_MANAGER",
  "COMERCIAL",
  "VIEWER",
] as const;

export async function POST(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.system.user.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const { name, email, password, role } = body;

  // Validaciones
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "El nombre es requerido" },
      { status: 400 }
    );
  }

  if (!email || typeof email !== "string" || email.trim().length === 0) {
    return NextResponse.json(
      { error: "El email es requerido" },
      { status: 400 }
    );
  }

  if (
    !password ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return NextResponse.json(
      { error: "La contrasena debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Rol invalido" },
      { status: 400 }
    );
  }

  // Verificar unicidad de email
  const existing = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "El email ya esta registrado" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      provider: "credentials",
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      activo: true,
      phone: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
