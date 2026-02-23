import Link from "next/link";
import Image from "next/image";
import { Bike, Star } from "lucide-react";
import { DSBadge } from "@/components/ui/ds-badge";
import { formatMoney } from "@/lib/format";
import { TIPO_MOTO_LABELS } from "@/lib/catalog-utils";
import type { TipoMoto } from "@prisma/client";

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
  frecuenciaPrecio: string;
}

export function MotoCard({ moto }: { moto: MotoPublic }) {
  return (
    <Link href={`/catalogo/${moto.id}`}>
      <div className="group overflow-hidden rounded-2xl border border-border bg-bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-[var(--ds-accent)]/30 hover:shadow-lg hover:shadow-[var(--accent-glow)]">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-bg-input overflow-hidden">
          {moto.foto ? (
            <Image
              src={moto.foto}
              alt={`${moto.marca} ${moto.modelo}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-bg-input to-bg-card">
              <Bike className="h-16 w-16 text-t-tertiary/50" />
            </div>
          )}
          {moto.destacada && (
            <DSBadge variant="warning" className="absolute top-3 left-3 gap-1">
              <Star className="h-3 w-3" /> Destacada
            </DSBadge>
          )}
          <DSBadge variant="accent" className="absolute top-3 right-3">
            {TIPO_MOTO_LABELS[moto.tipo as TipoMoto] ?? moto.tipo}
          </DSBadge>
        </div>

        {/* Info */}
        <div className="p-5 space-y-1">
          <h3 className="font-display font-bold text-lg text-t-primary leading-tight">
            {moto.marca} {moto.modelo}
          </h3>
          <p className="text-sm text-t-secondary">
            {moto.anio}
            {moto.cilindrada ? ` · ${moto.cilindrada} cc` : ""}
            {` · ${moto.km.toLocaleString("es-AR")} km`}
          </p>

          <div className="pt-3 mt-3 border-t border-border flex items-baseline gap-1">
            <span className="text-xs text-t-tertiary">Desde</span>
            <span className="font-display font-extrabold text-xl text-[var(--ds-accent)]">
              {formatMoney(moto.precioDesde)}
            </span>
            <span className="text-xs text-t-secondary">
              /{moto.frecuenciaPrecio === "semanal" ? "semana" : "mes"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
