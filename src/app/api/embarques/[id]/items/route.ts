import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const itemSchema = z.object({
  descripcion: z.string().min(1),
  codigoProveedor: z.string().optional().nullable(),
  repuestoId: z.string().optional().nullable(),
  esMoto: z.boolean().default(false),
  cantidad: z.number().int().positive(),
  precioFOBUnitario: z.number().positive(),
  posicionArancelaria: z.string().optional().nullable(),
  alicuotaDerechos: z.number().min(0).max(100).optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.shipment.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const items = await prisma.itemEmbarque.findMany({
    where: { embarqueId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: items });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.shipment.update,
    "canCreate",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const embarque = await prisma.embarqueImportacion.findUnique({ where: { id } });
  if (!embarque) {
    return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
  }
  if (embarque.estado !== "BORRADOR") {
    return NextResponse.json(
      { error: "Solo se pueden agregar items en estado BORRADOR" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const subtotalFOB = parsed.data.precioFOBUnitario * parsed.data.cantidad;
  const item = await prisma.itemEmbarque.create({
    data: {
      embarqueId: id,
      ...parsed.data,
      subtotalFOB,
    },
  });

  // Recalcular totalFOB
  const items = await prisma.itemEmbarque.findMany({ where: { embarqueId: id } });
  const totalFOB = items.reduce((sum, i) => sum + Number(i.subtotalFOB), 0);
  await prisma.embarqueImportacion.update({
    where: { id },
    data: { totalFOB },
  });

  return NextResponse.json(item, { status: 201 });
}
