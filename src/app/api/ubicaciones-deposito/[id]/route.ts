import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ubicacionCreateSchema } from "@/lib/validations/repuesto";
import { apiSetup } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const ubicacion = await prisma.ubicacionDeposito.findUnique({
    where: { id },
    include: {
      repuestos: {
        where: { activo: true },
        select: { id: true, codigo: true, nombre: true, stock: true, categoria: true },
        orderBy: { nombre: "asc" },
      },
      _count: { select: { repuestos: true } },
    },
  });

  if (!ubicacion) {
    return NextResponse.json({ error: "Ubicación no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: ubicacion });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = ubicacionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ubicacion = await prisma.ubicacionDeposito.update({
    where: { id },
    data: {
      codigo: parsed.data.codigo,
      nombre: parsed.data.nombre,
      sector: parsed.data.sector ?? undefined,
      nivel: parsed.data.nivel ?? undefined,
      descripcion: parsed.data.descripcion ?? undefined,
    },
  });

  return NextResponse.json({ data: ubicacion });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.inventory.adjustStock,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const ubicacion = await prisma.ubicacionDeposito.update({
    where: { id },
    data: { activa: false },
  });

  return NextResponse.json({ data: ubicacion });
}
