"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCarrito } from "@/lib/carrito-context";

function formatPrecio(precio: number) {
  return `$${precio.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export default function CarritoPage() {
  const { items, actualizarCantidad, eliminarItem, totalPrecio } = useCarrito();

  const subtotal = totalPrecio;
  const iva = Math.round(subtotal * 0.21 * 100) / 100;
  const total = subtotal + iva;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <div className="rounded-full bg-[var(--ds-accent)]/10 p-4">
          <Package className="h-16 w-16 text-[var(--ds-accent)]" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl font-extrabold text-t-primary">
            Tu carrito esta vacio
          </h1>
          <p className="text-t-secondary">
            Agrega repuestos desde nuestro catalogo para comenzar.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/tienda">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Ir a la tienda
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <h1 className="font-display text-3xl md:text-4xl font-extrabold text-t-primary">
        Mi Carrito
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items list */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.repuestoId}
              className="rounded-xl border border-border bg-bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-display font-bold text-t-primary truncate">
                  {item.nombre}
                </h3>
                <p className="text-sm text-t-secondary">
                  Codigo: {item.codigo}
                </p>
                <p className="text-sm text-t-secondary">
                  Precio unitario: {formatPrecio(item.precio)}
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={item.cantidad <= 1}
                  onClick={() =>
                    actualizarCantidad(item.repuestoId, item.cantidad - 1)
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-display font-bold text-t-primary w-8 text-center">
                  {item.cantidad}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={item.cantidad >= item.stock}
                  onClick={() =>
                    actualizarCantidad(item.repuestoId, item.cantidad + 1)
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Subtotal + remove */}
              <div className="flex items-center gap-4 sm:gap-6">
                <span className="font-display font-bold text-[var(--ds-accent)] text-lg min-w-[80px] text-right">
                  {formatPrecio(item.precio * item.cantidad)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => eliminarItem(item.repuestoId)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-bg-card p-6 space-y-4 sticky top-8">
            <h2 className="font-display text-xl font-bold text-t-primary">
              Resumen del pedido
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-t-secondary">
                <span>Subtotal</span>
                <span>{formatPrecio(subtotal)}</span>
              </div>
              <div className="flex justify-between text-t-secondary">
                <span>IVA (21%)</span>
                <span>{formatPrecio(iva)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-display font-bold text-t-primary">
                  Total
                </span>
                <span className="font-display font-bold text-[var(--ds-accent)] text-xl">
                  {formatPrecio(total)}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button asChild size="lg" className="w-full">
                <Link href="/tienda/checkout">Continuar compra</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/tienda">Seguir comprando</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
