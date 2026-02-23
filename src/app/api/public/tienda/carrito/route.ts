import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un item" },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const validatedItems: {
      repuestoId: string;
      codigo: string;
      nombre: string;
      precio: number;
      cantidad: number;
      stock: number;
      subtotal: number;
    }[] = [];

    for (const item of items) {
      const { repuestoId, cantidad } = item;

      if (!repuestoId || typeof cantidad !== "number" || cantidad < 1) {
        errors.push(`Item inválido: repuestoId y cantidad (>= 1) son requeridos`);
        continue;
      }

      const repuesto = await prisma.repuesto.findFirst({
        where: { id: repuestoId, activo: true },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          precioVenta: true,
          precioCompra: true,
          stock: true,
        },
      });

      if (!repuesto) {
        errors.push(`Repuesto ${repuestoId} no encontrado o no está activo`);
        continue;
      }

      if (repuesto.stock < cantidad) {
        errors.push(
          `Repuesto "${repuesto.nombre}" (${repuesto.codigo}): stock insuficiente (disponible: ${repuesto.stock}, solicitado: ${cantidad})`
        );
        continue;
      }

      const precio = Number(repuesto.precioVenta ?? repuesto.precioCompra);

      validatedItems.push({
        repuestoId: repuesto.id,
        codigo: repuesto.codigo,
        nombre: repuesto.nombre,
        precio,
        cantidad,
        stock: repuesto.stock,
        subtotal: precio * cantidad,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = Math.round(subtotal * 0.21 * 100) / 100;
    const total = Math.round((subtotal + iva) * 100) / 100;

    return NextResponse.json({
      items: validatedItems,
      subtotal,
      iva,
      total,
    });
  } catch (error: unknown) {
    console.error("Error en carrito:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
