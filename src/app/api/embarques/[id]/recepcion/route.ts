import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { OPERATIONS, eventBus } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { apiSetup } from "@/lib/api-helpers";
import { recepcionItemSchema } from "@/lib/validations/embarque";
import { registrarMovimiento } from "@/lib/stock-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  apiSetup();
  const { error, userId, session } = await requirePermission(
    OPERATIONS.supply.shipment.receive,
    "canExecute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;
  const embarque = await prisma.embarqueImportacion.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!embarque) {
    return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
  }
  if (embarque.estado !== "EN_RECEPCION" && embarque.estado !== "COSTOS_FINALIZADOS") {
    return NextResponse.json(
      { error: "El embarque debe estar EN_RECEPCION o COSTOS_FINALIZADOS para recibir" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = recepcionItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Validate quantities
  for (const recItem of parsed.data.items) {
    const item = embarque.items.find((i) => i.id === recItem.itemEmbarqueId);
    if (!item) {
      return NextResponse.json(
        { error: `Item ${recItem.itemEmbarqueId} no encontrado` },
        { status: 404 }
      );
    }
    const totalRecibido = item.cantidadRecibida + recItem.cantidadRecibida;
    if (totalRecibido > item.cantidad) {
      return NextResponse.json(
        { error: `Item "${item.descripcion}": cantidad recibida (${totalRecibido}) excede cantidad esperada (${item.cantidad})` },
        { status: 400 }
      );
    }
  }

  let costoTotalRecibido = 0;

  // Update each item and register stock movements
  for (const recItem of parsed.data.items) {
    if (recItem.cantidadRecibida <= 0) continue;

    const item = embarque.items.find((i) => i.id === recItem.itemEmbarqueId)!;

    await prisma.itemEmbarque.update({
      where: { id: recItem.itemEmbarqueId },
      data: {
        cantidadRecibida: { increment: recItem.cantidadRecibida },
      },
    });

    const costoUnit = Number(item.costoNacionalizadoUnit || 0);
    costoTotalRecibido += costoUnit * recItem.cantidadRecibida;

    // If linked to repuesto → register stock INGRESO
    if (item.repuestoId) {
      await registrarMovimiento({
        repuestoId: item.repuestoId,
        tipo: "INGRESO",
        cantidad: recItem.cantidadRecibida,
        descripcion: `Recepción importación ${embarque.numero}`,
        costoUnitario: costoUnit,
        referenciaTipo: "EmbarqueImportacion",
        referenciaId: id,
        userId: session?.user?.id,
      });

      // Update precioCompra and costoNacionalizado on the repuesto
      if (costoUnit > 0) {
        await prisma.repuesto.update({
          where: { id: item.repuestoId },
          data: {
            precioCompra: costoUnit,
            costoNacionalizado: costoUnit,
          },
        });
      }
    }
  }

  // Check if all items fully received
  const updatedItems = await prisma.itemEmbarque.findMany({ where: { embarqueId: id } });
  const todosRecibidos = updatedItems.every((i) => i.cantidadRecibida >= i.cantidad);

  const nuevoEstado = todosRecibidos ? "ALMACENADO" : "EN_RECEPCION";
  await prisma.embarqueImportacion.update({
    where: { id },
    data: {
      estado: nuevoEstado as "ALMACENADO" | "EN_RECEPCION",
      fechaRecepcion: todosRecibidos ? new Date() : undefined,
    },
  });

  // Emit reception event → handler contable (Inventario | Merc.Tránsito)
  await eventBus.emit(
    OPERATIONS.supply.shipment.receive,
    "EmbarqueImportacion",
    id,
    { costoTotalRecibido, todosRecibidos },
    userId
  );

  return NextResponse.json({ estado: nuevoEstado, todosRecibidos });
}
