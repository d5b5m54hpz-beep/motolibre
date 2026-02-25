import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { z } from "zod";

const sugerenciasSchema = z.object({
  itemServiceIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.maintenance.workOrder.create,
    "canView",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const body = await req.json();
  const parsed = sugerenciasSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const mappings = await prisma.itemServiceRepuesto.findMany({
    where: {
      itemServiceId: { in: parsed.data.itemServiceIds },
      repuesto: { activo: true },
    },
    include: {
      itemService: { select: { id: true, nombre: true } },
      repuesto: {
        select: {
          id: true,
          nombre: true,
          codigo: true,
          precioCompra: true,
          unidad: true,
          stock: true,
        },
      },
    },
  });

  const data = mappings.map((m) => ({
    itemServiceId: m.itemService.id,
    itemServiceNombre: m.itemService.nombre,
    repuestoId: m.repuesto.id,
    repuestoNombre: m.repuesto.nombre,
    repuestoCodigo: m.repuesto.codigo,
    repuestoPrecio: m.repuesto.precioCompra
      ? Number(m.repuesto.precioCompra)
      : null,
    repuestoUnidad: m.repuesto.unidad,
    repuestoStock: m.repuesto.stock,
    cantidadDefault: m.cantidadDefault,
    obligatorio: m.obligatorio,
    notas: m.notas,
  }));

  return NextResponse.json({ data });
}
