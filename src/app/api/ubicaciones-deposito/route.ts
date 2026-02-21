import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ubicacionCreateSchema } from "@/lib/validations/repuesto";
import { apiSetup } from "@/lib/api-helpers";

export async function GET() {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const data = await prisma.ubicacionDeposito.findMany({
    where: { activa: true },
    include: {
      _count: { select: { repuestos: true } },
    },
    orderBy: [{ sector: "asc" }, { nivel: "asc" }],
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = ubicacionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.ubicacionDeposito.findUnique({
    where: { codigo: parsed.data.codigo },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Ya existe ubicación con código ${parsed.data.codigo}` },
      { status: 409 }
    );
  }

  const ubicacion = await prisma.ubicacionDeposito.create({
    data: {
      codigo: parsed.data.codigo,
      nombre: parsed.data.nombre,
      sector: parsed.data.sector ?? undefined,
      nivel: parsed.data.nivel ?? undefined,
      descripcion: parsed.data.descripcion ?? undefined,
    },
  });

  return NextResponse.json({ data: ubicacion }, { status: 201 });
}
