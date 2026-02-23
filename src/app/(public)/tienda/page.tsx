"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ShoppingCart, Package, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCarrito } from "@/lib/carrito-context";

const CATEGORIAS = [
  "MOTOR",
  "FRENOS",
  "SUSPENSION",
  "ELECTRICA",
  "TRANSMISION",
  "CARROCERIA",
  "NEUMATICOS",
  "LUBRICANTES",
  "FILTROS",
  "TORNILLERIA",
  "ACCESORIOS",
  "OTRO",
] as const;

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

function TiendaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { agregarItem } = useCarrito();

  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const busqueda = searchParams.get("busqueda") ?? "";
  const categoria = searchParams.get("categoria") ?? "";
  const marca = searchParams.get("marca") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");

  const fetchRepuestos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (busqueda) params.set("busqueda", busqueda);
    if (categoria) params.set("categoria", categoria);
    if (marca) params.set("marca", marca);
    params.set("page", String(page));
    params.set("limit", "12");

    try {
      const res = await fetch(`/api/public/repuestos?${params}`);
      if (!res.ok) throw new Error("Error fetching");
      const json = await res.json();
      setRepuestos(json.repuestos);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch {
      setRepuestos([]);
    } finally {
      setLoading(false);
    }
  }, [busqueda, categoria, marca, page]);

  useEffect(() => {
    void fetchRepuestos();
  }, [fetchRepuestos]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== "page") params.set("page", "1");
    router.push(`/tienda?${params.toString()}`, { scroll: false });
  }

  function handleAgregar(r: Repuesto) {
    agregarItem({
      repuestoId: r.id,
      nombre: r.nombre,
      codigo: r.codigo,
      precio: r.precio,
      stock: r.stock,
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-t-primary">
          Repuestos y Accesorios
        </h1>
        <p className="text-t-secondary">
          {loading
            ? "Cargando..."
            : `${total} repuesto${total !== 1 ? "s" : ""} disponible${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-t-secondary" />
          <Input
            type="text"
            placeholder="Buscar repuestos..."
            value={busqueda}
            onChange={(e) => updateFilter("busqueda", e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={categoria}
          onValueChange={(v) => updateFilter("categoria", v === "TODAS" ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas las categorias</SelectItem>
            {CATEGORIAS.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORIA_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="text"
          placeholder="Marca..."
          value={marca}
          onChange={(e) => updateFilter("marca", e.target.value)}
          className="w-full sm:w-[160px]"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--ds-accent)]" />
        </div>
      ) : repuestos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-card border border-border">
            <Package className="h-8 w-8 text-t-tertiary" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-display font-bold text-t-primary">
              No se encontraron repuestos
            </p>
            <p className="text-sm text-t-secondary">
              Proba ajustando los filtros de busqueda.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {repuestos.map((r) => (
              <div
                key={r.id}
                className="group relative rounded-xl border border-border bg-bg-card p-4 flex flex-col gap-3 transition-colors hover:border-[var(--ds-accent)]/40"
              >
                <Link
                  href={`/tienda/${r.id}`}
                  className="absolute inset-0 z-0 rounded-xl"
                />
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORIA_LABELS[r.categoria] ?? r.categoria}
                  </Badge>
                  {r.stock <= 3 && r.stock > 0 && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      Ultimas unidades
                    </Badge>
                  )}
                  {r.stock === 0 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                      Sin stock
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-t-primary line-clamp-2">
                    {r.nombre}
                  </h3>
                  <p className="text-sm text-t-secondary line-clamp-1">
                    {[r.marca, r.modeloCompatible?.join(", ")]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                </div>
                <div className="mt-auto flex items-end justify-between gap-2">
                  <span className="font-display text-xl font-bold text-[var(--ds-accent)]">
                    ${r.precio.toLocaleString("es-AR")}
                  </span>
                  <Button
                    size="sm"
                    disabled={r.stock === 0}
                    className="relative z-10"
                    onClick={(e) => {
                      e.preventDefault();
                      handleAgregar(r);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateFilter("page", String(page - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-t-secondary px-3">
                Pagina {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateFilter("page", String(page + 1))}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TiendaPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--ds-accent)]" />
        </div>
      }
    >
      <TiendaContent />
    </Suspense>
  );
}
