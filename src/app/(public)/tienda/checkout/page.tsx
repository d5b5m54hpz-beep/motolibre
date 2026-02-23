"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCarrito } from "@/lib/carrito-context";

function formatPrecio(precio: number) {
  return `$${precio.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrecio, vaciarCarrito } = useCarrito();

  const [nombreCliente, setNombreCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [metodoEntrega, setMetodoEntrega] = useState<"RETIRO_LOCAL" | "ENVIO">(
    "RETIRO_LOCAL"
  );
  const [direccionEnvio, setDireccionEnvio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to cart if empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/tienda/carrito");
    }
  }, [items.length, router]);

  const subtotal = totalPrecio;
  const iva = Math.round(subtotal * 0.21 * 100) / 100;
  const total = subtotal + iva;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/public/tienda/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            repuestoId: item.repuestoId,
            cantidad: item.cantidad,
          })),
          nombreCliente,
          emailCliente,
          telefonoCliente: telefonoCliente || undefined,
          metodoEntrega,
          direccionEnvio:
            metodoEntrega === "ENVIO" ? direccionEnvio : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg =
          json.errors?.join(". ") || json.error || "Error al procesar el pago";
        setError(msg);
        return;
      }

      vaciarCarrito();

      if (json.initPoint) {
        window.location.href = json.initPoint;
      }
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <Link
        href="/tienda/carrito"
        className="inline-flex items-center gap-2 text-sm text-t-secondary hover:text-t-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al carrito
      </Link>

      <h1 className="font-display text-3xl md:text-4xl font-extrabold text-t-primary">
        Finalizar Compra
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos personales */}
            <div className="rounded-xl border border-border bg-bg-card p-6 space-y-5">
              <h2 className="font-display text-xl font-bold text-t-primary">
                Datos de contacto
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-t-primary">
                    Nombre completo *
                  </label>
                  <Input
                    required
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    placeholder="Juan Perez"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-t-primary">
                    Email *
                  </label>
                  <Input
                    type="email"
                    required
                    value={emailCliente}
                    onChange={(e) => setEmailCliente(e.target.value)}
                    placeholder="juan@ejemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-t-primary">
                    Telefono
                  </label>
                  <Input
                    value={telefonoCliente}
                    onChange={(e) => setTelefonoCliente(e.target.value)}
                    placeholder="11 1234-5678"
                  />
                </div>
              </div>
            </div>

            {/* Metodo de entrega */}
            <div className="rounded-xl border border-border bg-bg-card p-6 space-y-5">
              <h2 className="font-display text-xl font-bold text-t-primary">
                Metodo de entrega
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer transition-colors hover:border-[var(--ds-accent)]/40 has-[:checked]:border-[var(--ds-accent)] has-[:checked]:bg-[var(--ds-accent)]/5">
                  <input
                    type="radio"
                    name="metodoEntrega"
                    value="RETIRO_LOCAL"
                    checked={metodoEntrega === "RETIRO_LOCAL"}
                    onChange={() => setMetodoEntrega("RETIRO_LOCAL")}
                    className="accent-[var(--ds-accent)]"
                  />
                  <div>
                    <span className="font-medium text-t-primary">
                      Retiro en local
                    </span>
                    <p className="text-sm text-t-secondary">
                      Retira tu pedido en nuestro local sin costo adicional
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer transition-colors hover:border-[var(--ds-accent)]/40 has-[:checked]:border-[var(--ds-accent)] has-[:checked]:bg-[var(--ds-accent)]/5">
                  <input
                    type="radio"
                    name="metodoEntrega"
                    value="ENVIO"
                    checked={metodoEntrega === "ENVIO"}
                    onChange={() => setMetodoEntrega("ENVIO")}
                    className="accent-[var(--ds-accent)]"
                  />
                  <div>
                    <span className="font-medium text-t-primary">
                      Envio a domicilio
                    </span>
                    <p className="text-sm text-t-secondary">
                      Te lo enviamos a la direccion que indiques
                    </p>
                  </div>
                </label>
              </div>

              {metodoEntrega === "ENVIO" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-t-primary">
                    Direccion de envio *
                  </label>
                  <Textarea
                    required
                    value={direccionEnvio}
                    onChange={(e) => setDireccionEnvio(e.target.value)}
                    placeholder="Calle, numero, piso, departamento, ciudad, provincia"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-bg-card p-6 space-y-4 sticky top-8">
              <h2 className="font-display text-xl font-bold text-t-primary">
                Resumen del pedido
              </h2>

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.repuestoId}
                    className="flex justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-t-primary truncate">{item.nombre}</p>
                      <p className="text-t-secondary text-xs">
                        x{item.cantidad}
                      </p>
                    </div>
                    <span className="text-t-primary whitespace-nowrap">
                      {formatPrecio(item.precio * item.cantidad)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-t-secondary">
                  <span>Subtotal</span>
                  <span>{formatPrecio(subtotal)}</span>
                </div>
                <div className="flex justify-between text-t-secondary">
                  <span>IVA (21%)</span>
                  <span>{formatPrecio(iva)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-display font-bold text-t-primary">
                    Total
                  </span>
                  <span className="font-display font-bold text-[var(--ds-accent)] text-xl">
                    {formatPrecio(total)}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Pagar con MercadoPago"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
