import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { cuentaContableSchema } from "@/lib/validations/asiento";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  apiSetup();

  const { error } = await requirePermission(
    OPERATIONS.accounting.account.create,
    "canView",
    ["ADMIN", "CONTADOR"]
  );
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const tipo = sp.get("tipo");
  const nivel = sp.get("nivel");
  const soloMovimientos = sp.get("soloMovimientos") === "true";
  const search = sp.get("search");

  const where: Record<string, unknown> = {};
  if (tipo) where.tipo = tipo;
  if (nivel) where.nivel = parseInt(nivel);
  if (soloMovimientos) where.aceptaMovimientos = true;
  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: "insensitive" } },
      { nombre: { contains: search, mode: "insensitive" } },
    ];
  }

  const cuentas = await prisma.cuentaContable.findMany({
    where,
    orderBy: { codigo: "asc" },
    include: {
      _count: { select: { lineasAsiento: true, hijos: true } },
    },
  });

  return NextResponse.json({ data: cuentas });
}

export async function POST(req: NextRequest) {
  apiSetup();

  const { error, userId } = await requirePermission(
    OPERATIONS.accounting.account.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = cuentaContableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Verificar código único
  const exists = await prisma.cuentaContable.findUnique({ where: { codigo: data.codigo } });
  if (exists) {
    return NextResponse.json({ error: "Código de cuenta ya existe" }, { status: 409 });
  }

  // Verificar padre existe si se indicó
  if (data.padreId) {
    const padre = await prisma.cuentaContable.findUnique({ where: { id: data.padreId } });
    if (!padre) {
      return NextResponse.json({ error: "Cuenta padre no encontrada" }, { status: 400 });
    }
  }

  const cuenta = await withEvent(
    OPERATIONS.accounting.account.create,
    "CuentaContable",
    () =>
      prisma.cuentaContable.create({
        data: {
          codigo: data.codigo,
          nombre: data.nombre,
          tipo: data.tipo,
          nivel: data.nivel,
          padreId: data.padreId ?? null,
          aceptaMovimientos: data.aceptaMovimientos,
          descripcion: data.descripcion ?? null,
        },
      }),
    userId
  );

  return NextResponse.json({ data: cuenta }, { status: 201 });
}
