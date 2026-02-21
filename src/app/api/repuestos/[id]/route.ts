import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { repuestoCreateSchema } from "@/lib/validations/repuesto";
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
  const repuesto = await prisma.repuesto.findUnique({
    where: { id },
    include: {
      ubicacion: true,
      movimientos: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      historialCostos: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!repuesto) {
    return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: repuesto });
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
  const parsed = repuestoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.repuesto.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
  }

  // Check unique codigo if changed
  if (parsed.data.codigo !== existing.codigo) {
    const dup = await prisma.repuesto.findUnique({ where: { codigo: parsed.data.codigo } });
    if (dup) {
      return NextResponse.json(
        { error: `Ya existe un repuesto con código ${parsed.data.codigo}` },
        { status: 409 }
      );
    }
  }

  // Track price change
  const precioAnterior = Number(existing.precioCompra);
  const precioNuevo = parsed.data.precioCompra;

  const repuesto = await prisma.repuesto.update({
    where: { id },
    data: {
      codigo: parsed.data.codigo,
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion ?? undefined,
      categoria: parsed.data.categoria,
      marca: parsed.data.marca ?? undefined,
      modeloCompatible: parsed.data.modeloCompatible,
      stockMinimo: parsed.data.stockMinimo,
      stockMaximo: parsed.data.stockMaximo ?? undefined,
      unidad: parsed.data.unidad,
      precioCompra: parsed.data.precioCompra,
      precioVenta: parsed.data.precioVenta ?? undefined,
      moneda: parsed.data.moneda,
      precioFOB: parsed.data.precioFOB ?? undefined,
      proveedorId: parsed.data.proveedorId ?? undefined,
      proveedorCodigo: parsed.data.proveedorCodigo ?? undefined,
      ubicacionId: parsed.data.ubicacionId ?? undefined,
    },
  });

  // Register price change in history
  if (precioNuevo !== precioAnterior) {
    await prisma.historialCostoRepuesto.create({
      data: {
        repuestoId: id,
        precioAnterior,
        precioNuevo,
        motivo: "Ajuste manual",
      },
    });
  }

  return NextResponse.json({ data: repuesto });
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
  const repuesto = await prisma.repuesto.update({
    where: { id },
    data: { activo: false },
  });

  return NextResponse.json({ data: repuesto });
}
