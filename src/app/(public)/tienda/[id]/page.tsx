"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Minus, Plus, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCarrito } from "@/lib/carrito-context";

const CATEGORIA_LABELS: Record<string, string> = {
  MOTOR: "Motor",
  FRENOS: "Frenos",
  SUSPENSION: "Suspension",
  ELECTRICA: "Electrica",
  TRANSMISION: "Transmision",
  CARROCERIA: "Carroceria",
  NEUMATICOS: "Neumaticos",
  LUBRICANTES: "Lubricantes",
  FILTROS: "Filtros",
  TORNILLERIA: "Tornilleria",
  ACCESORIOS: "Accesorios",
  OTRO: "Otro",
};

interface Repuesto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  marca: string | null;
  modeloCompatible: string[];
  stock: number;
  precio: number;
}

export default function RepuestoDetailPage() {
  const params = useParams<{ id: string }>();
  const { agregarItem } = useCarrito();

  const [repuesto, setRepuesto] = useState<Repuesto | null>(null);
  const [relacionados, setRelacionados] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    async function fetchRepuesto() {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/repuestos/${params.id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Error fetching");
        const json = await res.json();
        setRepuesto(json.repuesto);
        setRelacionados(json.relacionados ?? []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    void fetchRepuesto();
  }, [params.id]);

  function handleAgregar() {
    if (!repuesto) return;
    agregarItem({
      repuestoId: repuesto.id,
      nombre: repuesto.nombre,
      codigo: repuesto.codigo,
      precio: repuesto.precio,
      stock: repuesto.stock,
      cantidad,
    });
  }

  function handleAgregarRelacionado(r: Repuesto) {
    agregarItem({
      repuestoId: r.id,
      nombre: r.nombre,
      codigo: r.codigo,
      precio: r.precio,
      stock: r.stock,
    });
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ds-accent)]" />
      </div>
    );
  }

  if (notFound || !repuesto) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-card border border-border">
          <Package className="h-8 w-8 text-t-tertiary" />
        </div>
        <p className="font-display font-bold text-t-primary">
          Repuesto no encontrado
        </p>
        <Button asChild variant="outline">
          <Link href="/tienda">Volver a la tienda</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Back link */}
      <Link
        href="/tienda"
        className="inline-flex items-center gap-2 text-sm text-t-secondary hover:text-t-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a la tienda
      </Link>

      {/* Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: info */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">
                {CATEGORIA_LABELS[repuesto.categoria] ?? repuesto.categoria}
              </Badge>
              {repuesto.stock <= 3 && repuesto.stock > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  Ultimas unidades
                </Badge>
              )}
              {repuesto.stock === 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  Sin stock
                </Badge>
              )}
              {repuesto.stock > 3 && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  En stock ({repuesto.stock})
                </Badge>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-t-primary">
              {repuesto.nombre}
            </h1>
            <p className="text-sm text-t-secondary">
              Codigo: {repuesto.codigo}
            </p>
          </div>

          {repuesto.marca && (
            <div>
              <span className="text-sm text-t-secondary">Marca:</span>{" "}
              <span className="text-t-primary font-medium">{repuesto.marca}</span>
            </div>
          )}

          {repuesto.modeloCompatible && repuesto.modeloCompatible.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-t-secondary">Modelos compatibles:</span>
              <div className="flex flex-wrap gap-2">
                {repuesto.modeloCompatible.map((modelo) => (
                  <Badge key={modelo} variant="outline" className="text-xs">
                    {modelo}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {repuesto.descripcion && (
            <div className="space-y-2">
              <span className="text-sm text-t-secondary">Descripcion:</span>
              <p className="text-t-primary">{repuesto.descripcion}</p>
            </div>
          )}
        </div>

        {/* Right: price + actions */}
        <div className="rounded-xl border border-border bg-bg-card p-6 space-y-6 h-fit lg:sticky lg:top-8">
          <div>
            <span className="text-sm text-t-secondary">Precio</span>
            <p className="font-display text-4xl font-bold text-[var(--ds-accent)]">
              ${repuesto.precio.toLocaleString("es-AR")}
            </p>
          </div>

          {/* Quantity selector */}
          <div className="space-y-2">
            <span className="text-sm text-t-secondary">Cantidad</span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={cantidad <= 1}
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-display font-bold text-t-primary text-lg w-8 text-center">
                {cantidad}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={cantidad >= repuesto.stock}
                onClick={() =>
                  setCantidad((c) => Math.min(repuesto.stock, c + 1))
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-t-secondary">
                ({repuesto.stock} disponible{repuesto.stock !== 1 ? "s" : ""})
              </span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={repuesto.stock === 0}
            onClick={handleAgregar}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Agregar al carrito
          </Button>
        </div>
      </div>

      {/* Related */}
      {relacionados.length > 0 && (
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold text-t-primary">
            Repuestos relacionados
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relacionados.map((r) => (
              <div
                key={r.id}
                className="group relative rounded-xl border border-border bg-bg-card p-4 flex flex-col gap-3 transition-colors hover:border-[var(--ds-accent)]/40"
              >
                <Link
                  href={`/tienda/${r.id}`}
                  className="absolute inset-0 z-0 rounded-xl"
                />
                <Badge variant="secondary" className="text-xs w-fit">
                  {CATEGORIA_LABELS[r.categoria] ?? r.categoria}
                </Badge>
                <h3 className="font-display font-bold text-t-primary line-clamp-2 text-sm">
                  {r.nombre}
                </h3>
                <p className="text-xs text-t-secondary line-clamp-1">
                  {[r.marca, r.modeloCompatible?.join(", ")]
                    .filter(Boolean)
                    .join(" - ")}
                </p>
                <div className="mt-auto flex items-end justify-between gap-2">
                  <span className="font-display text-lg font-bold text-[var(--ds-accent)]">
                    ${r.precio.toLocaleString("es-AR")}
                  </span>
                  <Button
                    size="xs"
                    disabled={r.stock === 0}
                    className="relative z-10"
                    onClick={(e) => {
                      e.preventDefault();
                      handleAgregarRelacionado(r);
                    }}
                  >
                    <ShoppingCart className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
