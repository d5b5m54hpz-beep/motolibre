import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ocCambiarEstadoSchema } from "@/lib/validations/orden-compra";
import { apiSetup } from "@/lib/api-helpers";
import type { EstadoOrdenCompra } from "@prisma/client";

const TRANSICIONES: Record<EstadoOrdenCompra, EstadoOrdenCompra[]> = {
  BORRADOR: ["ENVIADA", "CANCELADA"],
  ENVIADA: ["CONFIRMADA", "CANCELADA"],
  CONFIRMADA: ["RECIBIDA", "CANCELADA"],
  RECIBIDA: [],
  CANCELADA: [],
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error } = await requirePermission(
    OPERATIONS.supply.purchaseOrder.approve,
    "canExecute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = ocCambiarEstadoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const oc = await prisma.ordenCompra.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!oc) {
    return NextResponse.json({ error: "OC no encontrada" }, { status: 404 });
  }

  const nuevoEstado = parsed.data.estado;
  const validas = TRANSICIONES[oc.estado];
  if (!validas.includes(nuevoEstado)) {
    return NextResponse.json(
      { error: `Transición ${oc.estado} → ${nuevoEstado} no permitida` },
      { status: 400 }
    );
  }

  // Cancelar requires motivo
  if (nuevoEstado === "CANCELADA" && !parsed.data.motivoCancelacion) {
    return NextResponse.json({ error: "Motivo de cancelación requerido" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { estado: nuevoEstado };

  if (nuevoEstado === "CANCELADA") {
    updateData.motivoCancelacion = parsed.data.motivoCancelacion;
  }

  if (nuevoEstado === "RECIBIDA") {
    updateData.fechaRecepcion = new Date();

    // Update cantidadRecibida for each item
    if (parsed.data.itemsRecibidos && parsed.data.itemsRecibidos.length > 0) {
      for (const ir of parsed.data.itemsRecibidos) {
        await prisma.itemOrdenCompra.update({
          where: { id: ir.itemId },
          data: { cantidadRecibida: ir.cantidadRecibida },
        });
      }
    } else {
      // Full reception: set all items as fully received
      for (const item of oc.items) {
        await prisma.itemOrdenCompra.update({
          where: { id: item.id },
          data: { cantidadRecibida: item.cantidad },
        });
      }
    }
  }

  const updated = await prisma.ordenCompra.update({
    where: { id },
    data: updateData,
    include: {
      proveedor: { select: { id: true, nombre: true } },
      items: true,
    },
  });

  return NextResponse.json({ data: updated });
}
