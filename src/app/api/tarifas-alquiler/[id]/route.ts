import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, withEvent } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { tarifaUpdateSchema } from "@/lib/validations/tarifa";
import type { TipoAjuste } from "@prisma/client";

const TRACKED_FIELDS = [
  "marca",
  "modelo",
  "condicion",
  "plan",
  "frecuencia",
  "precio",
  "costoAmortizacion",
  "costoMantenimiento",
  "costoSeguro",
  "costoPatente",
  "costoOperativo",
  "margenPct",
  "activo",
  "vigenciaDesde",
  "vigenciaHasta",
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.pricing.rental.create,
    "canView",
    ["ADMIN", "OPERADOR", "COMERCIAL"]
  );
  if (error) return error;

  const { id } = await params;
  const tarifa = await prisma.tarifaAlquiler.findUnique({
    where: { id },
    include: {
      historial: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!tarifa) {
    return NextResponse.json({ error: "Tarifa no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: tarifa });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.pricing.rental.update,
    "canCreate",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = tarifaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.tarifaAlquiler.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Tarifa no encontrada" }, { status: 404 });
  }

  // Build historial entries for changed fields
  const historialEntries: {
    tarifaAlquilerId: string;
    campo: string;
    valorAnterior: string | null;
    valorNuevo: string;
    tipoAjuste: TipoAjuste;
    motivo: string | null;
    userId: string | null;
  }[] = [];

  for (const field of TRACKED_FIELDS) {
    if (parsed.data[field] !== undefined) {
      const oldVal = existing[field];
      const newVal = parsed.data[field];

      const oldStr = oldVal !== null && oldVal !== undefined ? String(oldVal) : null;
      const newStr = String(newVal);

      if (oldStr !== newStr) {
        const isPrice = field === "precio";
        const tipoAjuste: TipoAjuste =
          isPrice && oldVal !== null
            ? Number(newVal) > Number(oldVal)
              ? "INCREMENTO"
              : "DECREMENTO"
            : "INCREMENTO";

        historialEntries.push({
          tarifaAlquilerId: id,
          campo: field,
          valorAnterior: oldStr,
          valorNuevo: newStr,
          tipoAjuste,
          motivo: body.motivo ?? null,
          userId: userId ?? null,
        });
      }
    }
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.precio !== undefined) {
    updateData.precio = parsed.data.precio;
  }
  if (parsed.data.vigenciaDesde) {
    updateData.vigenciaDesde = new Date(parsed.data.vigenciaDesde);
  }
  if (parsed.data.vigenciaHasta) {
    updateData.vigenciaHasta = new Date(parsed.data.vigenciaHasta);
  } else if (parsed.data.vigenciaHasta === null) {
    updateData.vigenciaHasta = null;
  }

  const tarifa = await withEvent(
    OPERATIONS.pricing.rental.update,
    "TarifaAlquiler",
    () =>
      prisma.tarifaAlquiler.update({
        where: { id },
        data: updateData,
      }),
    userId
  );

  // Create historial entries
  if (historialEntries.length > 0) {
    await prisma.historialTarifa.createMany({ data: historialEntries });
  }

  return NextResponse.json({ data: tarifa });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.pricing.rental.deactivate,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.tarifaAlquiler.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Tarifa no encontrada" }, { status: 404 });
  }

  // Soft delete
  const tarifa = await withEvent(
    OPERATIONS.pricing.rental.deactivate,
    "TarifaAlquiler",
    () =>
      prisma.tarifaAlquiler.update({
        where: { id },
        data: { activo: false },
      }),
    userId
  );

  await prisma.historialTarifa.create({
    data: {
      tarifaAlquilerId: id,
      campo: "activo",
      valorAnterior: "true",
      valorNuevo: "false",
      tipoAjuste: "DECREMENTO",
      motivo: "Tarifa desactivada",
      userId,
    },
  });

  return NextResponse.json({ data: tarifa });
}
