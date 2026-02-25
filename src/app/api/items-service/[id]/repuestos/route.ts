import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import {
  mappingCreateSchema,
  mappingDeleteSchema,
} from "@/lib/validations/item-service-repuesto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const mappings = await prisma.itemServiceRepuesto.findMany({
    where: { itemServiceId: id },
    include: {
      repuesto: {
        select: {
          id: true,
          nombre: true,
          codigo: true,
          precioCompra: true,
          unidad: true,
          stock: true,
          categoria: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: mappings });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;

  const body = await req.json();
  const parsed = mappingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const mapping = await prisma.itemServiceRepuesto.upsert({
    where: {
      itemServiceId_repuestoId: {
        itemServiceId: id,
        repuestoId: parsed.data.repuestoId,
      },
    },
    update: {
      cantidadDefault: parsed.data.cantidadDefault,
      obligatorio: parsed.data.obligatorio,
      notas: parsed.data.notas ?? undefined,
      origenIA: parsed.data.origenIA,
    },
    create: {
      itemServiceId: id,
      repuestoId: parsed.data.repuestoId,
      cantidadDefault: parsed.data.cantidadDefault,
      obligatorio: parsed.data.obligatorio,
      notas: parsed.data.notas ?? undefined,
      origenIA: parsed.data.origenIA,
    },
    include: {
      repuesto: {
        select: {
          id: true,
          nombre: true,
          codigo: true,
          precioCompra: true,
          unidad: true,
        },
      },
    },
  });

  return NextResponse.json({ data: mapping }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;

  const body = await req.json();
  const parsed = mappingDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await prisma.itemServiceRepuesto.delete({
    where: {
      itemServiceId_repuestoId: {
        itemServiceId: id,
        repuestoId: parsed.data.repuestoId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
