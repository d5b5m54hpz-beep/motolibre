import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DSBadge } from "@/components/ui/ds-badge";
import { Bike, ExternalLink } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const moto = await prisma.moto.findUnique({
    where: { id },
    select: { marca: true, modelo: true },
  });
  return {
    title: moto
      ? `${moto.marca} ${moto.modelo} | MotoLibre`
      : "Moto | MotoLibre",
  };
}

export default async function ScanPage({ params }: Props) {
  const { id } = await params;

  const moto = await prisma.moto.findUnique({
    where: { id },
    select: {
      id: true, marca: true, modelo: true, anio: true, color: true,
      cilindrada: true, tipo: true, km: true, patente: true, estado: true,
      imagenUrl: true, fotos: true,
    },
  });

  if (!moto) notFound();

  const foto = moto.fotos[0] ?? moto.imagenUrl ?? null;
  const estadoPublico =
    moto.estado === "DISPONIBLE" ? "Disponible" :
    moto.estado === "ALQUILADA" ? "Alquilada" :
    moto.estado === "EN_SERVICE" ? "En servicio" :
    "No disponible";
  const estadoVariant =
    moto.estado === "DISPONIBLE" ? "positive" as const :
    moto.estado === "ALQUILADA" ? "accent" as const :
    "neutral" as const;

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      {/* Logo */}
      <div className="text-center">
        <Link href="/catalogo" className="inline-flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-[var(--ds-accent)] to-[var(--ds-info)] p-2 rounded-xl">
            <Bike className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-extrabold text-xl text-t-primary">
            MotoLibre
          </span>
        </Link>
      </div>

      {/* Moto card */}
      <div className="rounded-2xl border border-border bg-bg-card/80 overflow-hidden">
        {foto && (
          <div className="relative aspect-[16/9] bg-bg-input">
            <Image
              src={foto}
              alt={`${moto.marca} ${moto.modelo}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
        )}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-extrabold text-t-primary">
              {moto.marca} {moto.modelo}
            </h1>
            <DSBadge variant={estadoVariant}>{estadoPublico}</DSBadge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-t-tertiary">Patente</p>
              <p className="text-t-primary font-medium">{moto.patente ?? "—"}</p>
            </div>
            <div>
              <p className="text-t-tertiary">Año</p>
              <p className="text-t-primary font-medium">{moto.anio}</p>
            </div>
            {moto.color && (
              <div>
                <p className="text-t-tertiary">Color</p>
                <p className="text-t-primary font-medium">{moto.color}</p>
              </div>
            )}
            {moto.cilindrada && (
              <div>
                <p className="text-t-tertiary">Cilindrada</p>
                <p className="text-t-primary font-medium">{moto.cilindrada} cc</p>
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <div className="text-sm text-t-secondary space-y-1">
            <p className="font-medium text-t-primary">MotoLibre S.A.</p>
            <p>CUIT: 30-71617222-4</p>
            <p>Esta moto es propiedad de MotoLibre S.A.</p>
          </div>
        </div>
      </div>

      {/* CTAs */}
      {moto.estado === "DISPONIBLE" && (
        <Button asChild className="w-full" size="lg">
          <Link href={`/catalogo/${moto.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver en catálogo
          </Link>
        </Button>
      )}

      <p className="text-center text-xs text-t-tertiary">
        ¿Querés alquilar una moto?{" "}
        <Link href="/catalogo" className="text-[var(--ds-accent)] hover:underline">
          Ver catálogo
        </Link>
        <br />
        Reportar problema:{" "}
        <span className="text-t-secondary">soporte@motolibre.com.ar</span>
      </p>
    </div>
  );
}
