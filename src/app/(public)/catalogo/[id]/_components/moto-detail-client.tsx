"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bike } from "lucide-react";
import { Gallery } from "./gallery";
import { PlanSelector } from "./plan-selector";
import { SpecGrid } from "./spec-grid";
import { RelatedMotos } from "./related-motos";
import { DSBadge } from "@/components/ui/ds-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TIPO_MOTO_LABELS } from "@/lib/catalog-utils";
import type { TipoMoto } from "@prisma/client";

interface Plan {
  planId: string;
  nombre: string;
  codigo: string;
  frecuencia: string;
  duracionMeses: number | null;
  descuento: number;
  incluyeTransferencia: boolean;
  precioBase: number;
  precioFinal: number;
  moneda: string;
}

interface Specs {
  cilindrada: string | null;
  potencia: string | null;
  tipoMotor: string | null;
  arranque: string | null;
  frenos: string | null;
  capacidadTanque: string | null;
  peso: string | null;
  km: string;
}

interface RelatedMoto {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  cilindrada: number | null;
  tipo: string;
  km: number;
  foto: string | null;
  precioDesde: number | null;
  frecuenciaPrecio: string;
}

interface MotoDetail {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  cilindrada: number | null;
  tipo: string;
  km: number;
  fotos: string[];
  destacada: boolean;
  condicion: string;
  planes: Plan[];
  specs: Specs;
  relacionadas: RelatedMoto[];
}

export function MotoDetailClient({ id }: { id: string }) {
  const [moto, setMoto] = useState<MotoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMoto() {
      try {
        const res = await fetch(`/api/public/motos/${id}`);
        if (!res.ok) throw new Error("Not found");
        const json = await res.json();
        setMoto(json.data);
      } catch {
        setMoto(null);
      } finally {
        setLoading(false);
      }
    }
    void fetchMoto();
  }, [id]);

  if (loading) return <DetailSkeleton />;

  if (!moto) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Bike className="h-16 w-16 text-t-tertiary mx-auto mb-4" />
        <p className="font-display font-bold text-t-primary">Moto no encontrada</p>
        <Link href="/catalogo" className="text-sm text-[var(--ds-accent)] hover:underline mt-2 inline-block">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const tipoLabel = TIPO_MOTO_LABELS[moto.tipo as TipoMoto] ?? moto.tipo;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Back link */}
      <Link
        href="/catalogo"
        className="inline-flex items-center gap-1.5 text-sm text-t-secondary hover:text-t-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </Link>

      {/* Main content: 2-column on desktop */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Gallery */}
        <Gallery fotos={moto.fotos} alt={`${moto.marca} ${moto.modelo}`} />

        {/* Right: Info + Plans */}
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <DSBadge variant="accent">{tipoLabel}</DSBadge>
              <DSBadge variant="neutral">{moto.condicion}</DSBadge>
              {moto.destacada && <DSBadge variant="warning">Destacada</DSBadge>}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-t-primary">
              {moto.marca} {moto.modelo}
            </h1>
            <p className="text-t-secondary">
              {moto.anio}
              {moto.cilindrada ? ` · ${moto.cilindrada} cc` : ""}
              {moto.color ? ` · ${moto.color}` : ""}
              {` · ${moto.km.toLocaleString("es-AR")} km`}
            </p>
          </div>

          {/* Plan selector */}
          {moto.planes.length > 0 && <PlanSelector planes={moto.planes} />}
        </div>
      </div>

      {/* Specs */}
      <SpecGrid specs={moto.specs} />

      {/* Related */}
      {moto.relacionadas.length > 0 && (
        <RelatedMotos motos={moto.relacionadas} />
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      <Skeleton className="h-5 w-40" />
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
