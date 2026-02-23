import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DSBadge } from "@/components/ui/ds-badge";
import { Bike, ChevronRight, Shield, Wrench, HeadphonesIcon } from "lucide-react";
import { TIPO_MOTO_LABELS } from "@/lib/catalog-utils";
import type { TipoMoto } from "@prisma/client";

interface MotoData {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  cilindrada: number | null;
  km: number;
  color: string | null;
  tipo: string;
  foto: string | null;
  condicion: string;
}

export function StepMoto({
  moto,
  onNext,
}: {
  moto: MotoData;
  onNext: () => void;
}) {
  const tipoLabel = TIPO_MOTO_LABELS[moto.tipo as TipoMoto] ?? moto.tipo;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-display text-2xl font-extrabold text-t-primary">
          Tu moto seleccionada
        </h2>
        <p className="text-sm text-t-secondary">
          Confirmá que es la moto que querés alquilar
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-bg-card/80 overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[16/9] bg-bg-input">
          {moto.foto ? (
            <Image
              src={moto.foto}
              alt={`${moto.marca} ${moto.modelo}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Bike className="h-20 w-20 text-t-tertiary/30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <DSBadge variant="accent">{tipoLabel}</DSBadge>
            <DSBadge variant="neutral">{moto.condicion}</DSBadge>
          </div>
          <h3 className="font-display text-2xl font-extrabold text-t-primary">
            {moto.marca} {moto.modelo}
          </h3>
          <p className="text-t-secondary">
            {moto.anio}
            {moto.cilindrada ? ` · ${moto.cilindrada} cc` : ""}
            {moto.color ? ` · ${moto.color}` : ""}
            {` · ${moto.km.toLocaleString("es-AR")} km`}
          </p>

          {/* Trust badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-t-secondary">
              <Shield className="h-4 w-4 text-[var(--ds-accent)]" />
              Seguro incluido
            </div>
            <div className="flex items-center gap-2 text-sm text-t-secondary">
              <Wrench className="h-4 w-4 text-[var(--ds-accent)]" />
              Service programado
            </div>
            <div className="flex items-center gap-2 text-sm text-t-secondary">
              <HeadphonesIcon className="h-4 w-4 text-[var(--ds-accent)]" />
              Asistencia mecánica
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-t-tertiary">
        ¿No es la moto que buscás?{" "}
        <Link href="/catalogo" className="text-[var(--ds-accent)] hover:underline">
          Volver al catálogo
        </Link>
      </p>

      <Button className="w-full" size="lg" onClick={onNext}>
        Siguiente: Elegí tu plan
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
