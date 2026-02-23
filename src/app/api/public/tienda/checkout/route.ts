import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mpPreference } from "@/lib/mercadopago";
import type { MetodoEntrega } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      items,
      nombreCliente,
      emailCliente,
      telefonoCliente,
      metodoEntrega,
      direccionEnvio,
    } = body;

    // ---------- Validaciones básicas ----------
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un item" },
        { status: 400 }
      );
    }

    if (!nombreCliente || typeof nombreCliente !== "string") {
      return NextResponse.json(
        { error: "nombreCliente es requerido" },
        { status: 400 }
      );
    }

    if (!emailCliente || typeof emailCliente !== "string") {
      return NextResponse.json(
        { error: "emailCliente es requerido" },
        { status: 400 }
      );
    }

    if (!metodoEntrega || !["RETIRO_LOCAL", "ENVIO"].includes(metodoEntrega)) {
      return NextResponse.json(
        { error: "metodoEntrega debe ser RETIRO_LOCAL o ENVIO" },
        { status: 400 }
      );
    }

    if (metodoEntrega === "ENVIO" && !direccionEnvio) {
      return NextResponse.json(
        { error: "direccionEnvio es requerido para envíos" },
        { status: 400 }
      );
    }

    // ---------- Transacción ----------
    const orden = await prisma.$transaction(async (tx) => {
      const errors: string[] = [];
      const itemsData: {
        repuestoId: string;
        codigoSnapshot: string;
        nombreSnapshot: string;
        precioUnitario: number;
        cantidad: number;
        subtotal: number;
      }[] = [];

      for (const item of items) {
        const { repuestoId, cantidad } = item;

        if (!repuestoId || typeof cantidad !== "number" || cantidad < 1) {
          errors.push("Item inválido: repuestoId y cantidad (>= 1) son requeridos");
          continue;
        }

        const repuesto = await tx.repuesto.findFirst({
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

        const precioUnitario = Number(repuesto.precioVenta ?? repuesto.precioCompra);

        itemsData.push({
          repuestoId: repuesto.id,
          codigoSnapshot: repuesto.codigo,
          nombreSnapshot: repuesto.nombre,
          precioUnitario,
          cantidad,
          subtotal: precioUnitario * cantidad,
        });
      }

      if (errors.length > 0) {
        throw new ValidationError(errors);
      }

      const subtotal = itemsData.reduce((sum, i) => sum + i.subtotal, 0);
      const iva = Math.round(subtotal * 0.21 * 100) / 100;
      const total = subtotal + iva;

      const created = await tx.ordenVentaRepuesto.create({
        data: {
          nombreCliente,
          emailCliente: emailCliente.toLowerCase(),
          telefonoCliente: telefonoCliente || null,
          metodoEntrega: metodoEntrega as MetodoEntrega,
          direccionEnvio: direccionEnvio || null,
          subtotal,
          iva,
          total,
          items: {
            create: itemsData.map((i) => ({
              repuestoId: i.repuestoId,
              codigoSnapshot: i.codigoSnapshot,
              nombreSnapshot: i.nombreSnapshot,
              precioUnitario: i.precioUnitario,
              cantidad: i.cantidad,
              subtotal: i.subtotal,
            })),
          },
        },
        include: { items: true },
      });

      return created;
    });

    // ---------- Crear preferencia MercadoPago ----------
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://motolibre-production.up.railway.app";

    const pref = await mpPreference.create({
      body: {
        external_reference: `pedido:${orden.id}`,
        items: orden.items.map((item) => ({
          id: item.repuestoId,
          title: item.nombreSnapshot,
          quantity: item.cantidad,
          unit_price: Number(item.precioUnitario),
          currency_id: "ARS",
        })),
        back_urls: {
          success: `${baseUrl}/tienda/orden/exito`,
          failure: `${baseUrl}/tienda/orden/error`,
          pending: `${baseUrl}/tienda/orden/pendiente`,
        },
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        auto_return: "approved",
      },
    });

    // Guardar preferenceId en la orden
    await prisma.ordenVentaRepuesto.update({
      where: { id: orden.id },
      data: { mpPreferenceId: pref.id },
    });

    return NextResponse.json(
      {
        ordenId: orden.id,
        initPoint: pref.init_point ?? pref.sandbox_init_point,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }

    console.error("Error en checkout:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ---------- Helper ----------

class ValidationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super("Validation failed");
    this.errors = errors;
  }
}
