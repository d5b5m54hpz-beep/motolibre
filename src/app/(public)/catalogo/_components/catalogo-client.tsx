"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MotoCard } from "./moto-card";
import { FilterBar } from "./filter-bar";
import { CatalogSkeleton } from "./catalog-skeleton";
import { Pagination } from "./pagination";
import { Bike, SearchX } from "lucide-react";

interface MotoPublic {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  cilindrada: number | null;
  tipo: string;
  km: number;
  foto: string | null;
  destacada: boolean;
  precioDesde: number;
  moneda: string;
  frecuenciaPrecio: string;
}

interface FiltrosDisponibles {
  marcas: string[];
  tipos: string[];
}

function CatalogoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [motos, setMotos] = useState<MotoPublic[]>([]);
  const [filtros, setFiltros] = useState<FiltrosDisponibles>({ marcas: [], tipos: [] });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const marca = searchParams.get("marca") ?? "";
  const tipo = searchParams.get("tipo") ?? "";
  const orden = searchParams.get("orden") ?? "marca";
  const precioMin = searchParams.get("precioMin") ?? "";
  const precioMax = searchParams.get("precioMax") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");

  const fetchMotos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (marca) params.set("marca", marca);
    if (tipo) params.set("tipo", tipo);
    if (orden) params.set("orden", orden);
    if (precioMin) params.set("precioMin", precioMin);
    if (precioMax) params.set("precioMax", precioMax);
    params.set("page", String(page));
    params.set("limit", "12");

    try {
      const res = await fetch(`/api/public/motos?${params}`);
      if (!res.ok) throw new Error("Error fetching");
      const json = await res.json();
      setMotos(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
      setFiltros(json.filtros);
    } catch {
      setMotos([]);
    } finally {
      setLoading(false);
    }
  }, [marca, tipo, orden, precioMin, precioMax, page]);

  useEffect(() => {
    void fetchMotos();
  }, [fetchMotos]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 when filters change
    if (key !== "page") params.set("page", "1");
    router.push(`/catalogo?${params.toString()}`, { scroll: false });
  }

  function clearFilters() {
    router.push("/catalogo", { scroll: false });
  }

  const hasActiveFilters = !!(marca || tipo || precioMin || precioMax);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-t-primary">
          Encontrá tu moto ideal
        </h1>
        <p className="text-t-secondary">
          {loading ? "Cargando..." : `${total} moto${total !== 1 ? "s" : ""} disponible${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filters */}
      <FilterBar
        filtros={filtros}
        marca={marca}
        tipo={tipo}
        orden={orden}
        precioMin={precioMin}
        precioMax={precioMax}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={updateFilter}
        onClear={clearFilters}
      />

      {/* Grid */}
      {loading ? (
        <CatalogSkeleton />
      ) : motos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-card border border-border">
            {hasActiveFilters ? (
              <SearchX className="h-8 w-8 text-t-tertiary" />
            ) : (
              <Bike className="h-8 w-8 text-t-tertiary" />
            )}
          </div>
          <div className="text-center space-y-1">
            <p className="font-display font-bold text-t-primary">
              {hasActiveFilters
                ? "No encontramos motos con esos filtros"
                : "No hay motos disponibles"}
            </p>
            <p className="text-sm text-t-tertiary">
              {hasActiveFilters
                ? "Probá ajustando tu búsqueda."
                : "Volvé pronto, sumamos motos todas las semanas."}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {motos.map((moto) => (
              <MotoCard key={moto.id} moto={moto} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => updateFilter("page", String(p))}
            />
          )}
        </>
      )}
    </div>
  );
}

export function CatalogoClient() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><CatalogSkeleton /></div>}>
      <CatalogoContent />
    </Suspense>
  );
}
