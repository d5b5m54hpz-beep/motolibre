import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TIPO_MOTO_LABELS } from "@/lib/catalog-utils";
import type { TipoMoto } from "@prisma/client";
import { MotoDetailClient } from "./_components/moto-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const moto = await prisma.moto.findFirst({
    where: { id, estado: "DISPONIBLE" },
    select: { marca: true, modelo: true, anio: true, tipo: true, cilindrada: true, imagenUrl: true, fotos: true },
  });

  if (!moto) return { title: "Moto no encontrada" };

  const title = `${moto.marca} ${moto.modelo} ${moto.anio} — Alquilar en MotoLibre`;
  const tipoLabel = TIPO_MOTO_LABELS[moto.tipo as TipoMoto] ?? moto.tipo;
  const description = `Alquilá la ${moto.marca} ${moto.modelo} ${moto.anio} (${tipoLabel}${moto.cilindrada ? `, ${moto.cilindrada}cc` : ""}). Planes semanales y mensuales con seguro incluido.`;
  const image = moto.fotos[0] ?? moto.imagenUrl ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image && { images: [{ url: image }] }),
    },
  };
}

export default async function MotoDetailPage({ params }: Props) {
  const { id } = await params;

  // Verify moto exists and is DISPONIBLE
  const exists = await prisma.moto.findFirst({
    where: { id, estado: "DISPONIBLE" },
    select: { id: true },
  });

  if (!exists) notFound();

  return <MotoDetailClient id={id} />;
}
